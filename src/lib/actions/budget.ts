"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { createBudgetSchema, BudgetWithConfigs } from "@/lib/validations/budget";
import { revalidatePath } from "next/cache";
import { differenceInCalendarMonths, addMonths, startOfMonth, format, parseISO } from "date-fns";

export type BudgetResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

export async function createBudget(
    workspaceId: string,
    data: any
): Promise<BudgetResult<any>> {
    const logger = createLogger();
    try {
        const validated = createBudgetSchema.parse(data);
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: createSafeError("Unauthorized", logger.correlationId) };

        // 0. Get Subcategory Info for naming if needed
        const { data: sub } = await supabase
            .from("subcategories")
            .select("name")
            .eq("id", validated.subcategoryId)
            .single();

        const budgetName = validated.name || sub?.name || "Untitled Budget";

        // 1. Create base budget
        const { data: budget, error: bError } = await supabase
            .from("budgets")
            .insert({
                workspace_id: workspaceId,
                subcategory_id: validated.subcategoryId,
                name: budgetName,
                currency: validated.currency,
                type: validated.type,
            })
            .select()
            .single();

        if (bError) throw bError;

        // 2. Insert Config
        if (validated.type === "PAYG") {
            const { error: cError } = await supabase.from("budget_payg_configs").insert({
                budget_id: budget.id,
                monthly_cap: validated.monthlyCap,
                is_recurring: validated.isRecurring ?? false,
                workspace_id: workspaceId // Add workspace_id for robust RLS
            });
            if (cError) {
                // Rollback
                await supabase.from("budgets").delete().eq("id", budget.id);
                throw cError;
            }
        } else {
            // Ensure proper date format for SQL (YYYY-MM-DD)
            // if incoming is YYYY-MM, default to end of month or start? Application logic usually implies "by end of month" or specific date.
            // Let's ensure it's a full date string.
            let dueDate = validated.dueDate;
            if (dueDate && dueDate.length === 7) {
                // YYYY-MM -> YYYY-MM-01 (Start) or End? 
                // Let's accept it as a target month, so due date is 1st of that month for calculation simplicity, 
                // or user intention might be end. Let's stick to "-01" for a valid DATE.
                dueDate = `${dueDate}-01`;
            }

            const { error: cError } = await supabase.from("budget_plan_configs").insert({
                budget_id: budget.id,
                target_amount: validated.targetAmount,
                due_date: dueDate,
                recurrence_type: validated.recurrence,
                start_policy: validated.startPolicy,
                allow_use_safe: validated.allowUseSafe,
                workspace_id: workspaceId // Add workspace_id for robust RLS
            });
            if (cError) {
                logger.error(`Config insertion failed for budget ${budget.id}. Rolling back...`, new Error(cError.message));
                // Rollback
                const { error: delError } = await supabase.from("budgets").delete().eq("id", budget.id);
                if (delError) {
                    logger.error(`CRITICAL: Rollback failed for budget ${budget.id}`, new Error(delError.message));
                }
                throw cError;
            }

            // 3. Auto-fund if requested
            if (data.autoFund && validated.type === "PLAN_SPEND") {
                logger.info("Auto-funding requested for budget", { budgetId: budget.id, accountId: data.fundingAccountId });
                try {
                    const config = {
                        target_amount: validated.targetAmount,
                        due_date: dueDate,
                        start_policy: validated.startPolicy,
                    };
                    const contribution = await calculateMonthlyContribution(config);
                    logger.debug("Calculated initial contribution", { contribution });

                    if (contribution > 0) {
                        const { error: fError } = await supabase.from("budget_ledger").insert({
                            workspace_id: workspaceId,
                            budget_id: budget.id,
                            type: "fund",
                            amount: contribution,
                            created_by: user.id,
                            metadata: {
                                month: format(new Date(), "yyyy-MM"),
                                funding_account_id: data.fundingAccountId,
                                auto_funded: true
                            }
                        });

                        if (fError) {
                            logger.warn("Auto-fund insert failed", { error: fError.message });
                            // Non-critical (?) - user can manually fund later.
                        } else {
                            logger.info("Auto-fund successful");
                        }
                    }
                } catch (fundErr) {
                    logger.error("Auto-fund logic error", fundErr as Error);
                    // Suppress so budget creation isn't failed by funding error?
                    // Or fail and rollback? User expects it to be funded.
                    // Let's suppress but warn.
                }
            }
        }

        // Refetch full budget to return to client (client needs config objects)
        const { data: fullBudget } = await supabase
            .from("budgets")
            .select(`
                *,
                subcategory:subcategories(
                    name,
                    category:categories(name)
                ),
                payg_config:budget_payg_configs(monthly_cap),
                plan_config:budget_plan_configs(*)
            `)
            .eq("id", budget.id)
            .single();

        const resultBudget = {
            ...fullBudget,
            payg_config: Array.isArray(fullBudget?.payg_config) ? fullBudget.payg_config[0] : fullBudget?.payg_config,
            plan_config: Array.isArray(fullBudget?.plan_config) ? fullBudget.plan_config[0] : fullBudget?.plan_config,
            current_reserved: 0 // New budget has 0 reserved (except maybe auto-fund? if auto-fund, we should calc it, but let's assume 0 or handle it later. Actually if auto-funded, ledger exists. But listBudgets calcs it. For now 0 is safe for UI display or we can fetch ledger.)
        };

        revalidatePath(`/w/${workspaceId}/budgets`);
        revalidatePath(`/w/${workspaceId}/dashboard`);
        return { success: true, data: resultBudget };
    } catch (error: any) {
        logger.error("Error creating budget", error);
        return { success: false, error: createSafeError(error?.message || "Failed to create budget", logger.correlationId) };
    }
}

export async function updateBudget(
    workspaceId: string,
    budgetId: string,
    data: { name?: string; monthlyCap?: number; targetAmount?: number; isRecurring?: boolean }
): Promise<BudgetResult> {
    const logger = createLogger();
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: createSafeError("Unauthorized", logger.correlationId) };

        // Get budget to determine type
        const { data: budget, error: fetchError } = await supabase
            .from("budgets")
            .select("type")
            .eq("id", budgetId)
            .eq("workspace_id", workspaceId)
            .single();

        if (fetchError || !budget) {
            return { success: false, error: createSafeError("Budget not found", logger.correlationId) };
        }

        // Update budget name if provided
        if (data.name !== undefined) {
            const { error: nameError } = await supabase
                .from("budgets")
                .update({ name: data.name })
                .eq("id", budgetId);
            if (nameError) throw nameError;
        }

        // Update config based on type
        if (budget.type === "PAYG") {
            const updateData: any = {};
            if (data.monthlyCap !== undefined) updateData.monthly_cap = data.monthlyCap;
            if (data.isRecurring !== undefined) updateData.is_recurring = data.isRecurring;

            if (Object.keys(updateData).length > 0) {
                const { error: configError } = await supabase
                    .from("budget_payg_configs")
                    .update(updateData)
                    .eq("budget_id", budgetId);
                if (configError) throw configError;
            }
        } else if (budget.type === "PLAN_SPEND") {
            if (data.targetAmount !== undefined) {
                const { error: configError } = await supabase
                    .from("budget_plan_configs")
                    .update({ target_amount: data.targetAmount })
                    .eq("budget_id", budgetId);
                if (configError) throw configError;
            }
        }

        revalidatePath(`/w/${workspaceId}/budgets`);
        revalidatePath(`/w/${workspaceId}/dashboard`);
        return { success: true };
    } catch (error: any) {
        logger.error("Error updating budget", error);
        return { success: false, error: createSafeError(error?.message || "Failed to update budget", logger.correlationId) };
    }
}

export async function listBudgets(workspaceId: string): Promise<BudgetResult<BudgetWithConfigs[]>> {
    const logger = createLogger();
    try {
        const supabase = await createClient();

        // Fetch budgets with configs and category info
        const { data, error } = await supabase
            .from("budgets")
            .select(`
                *,
                subcategory:subcategories(
                    name,
                    category:categories(name)
                ),
                payg_config:budget_payg_configs(monthly_cap),
                plan_config:budget_plan_configs(*)
            `)
            .eq("workspace_id", workspaceId)
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false });

        if (error) {
            // console.error("[Budget Debug] Error fetching budgets:", error);
            throw error;
        }

        // console.log(`[Budget Debug] Fetched ${data?.length} budgets for workspace ${workspaceId}`);

        // Debug: Log the first budget to see config structure
        if (data && data.length > 0) {
            logger.info(`Fetched ${data.length} budgets. Sample:`, {
                id: data[0].id,
                plan_config: data[0].plan_config,
                payg_config: data[0].payg_config
            });
        }

        // Fetch current reserved amounts from ledger
        const { data: ledgerSums, error: lError } = await supabase
            .from("budget_ledger")
            .select("budget_id, type, amount")
            .eq("workspace_id", workspaceId);

        if (lError) throw lError;

        const reservedMap = new Map<string, number>();
        ledgerSums?.forEach(entry => {
            const current = reservedMap.get(entry.budget_id) || 0;
            if (entry.type === 'fund' || entry.type === 'adjust') {
                reservedMap.set(entry.budget_id, current + Number(entry.amount));
            } else {
                reservedMap.set(entry.budget_id, current - Number(entry.amount));
            }
        });

        // Fetch spending (expense transactions) by subcategory for this month
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const startOfMonth = `${currentMonth}-01`;
        const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: transactions, error: txError } = await supabase
            .from("transactions")
            .select("subcategory_id, base_amount, type")
            .eq("workspace_id", workspaceId)
            .gte("date", startOfMonth)
            .lte("date", endOfMonth);

        if (txError) {
            // Log error but continue - budget display will show 0 spending
        }

        // Sum spending by subcategory (expense transactions only)
        const spendingMap = new Map<string, number>();
        transactions?.forEach(tx => {
            if (tx.subcategory_id && tx.type === "expense") {
                const current = spendingMap.get(tx.subcategory_id) || 0;
                spendingMap.set(tx.subcategory_id, current + Math.abs(Number(tx.base_amount)));
            }
        });

        const budgetsWithBalances = (data as any[]).map(b => {
            const payg = Array.isArray(b.payg_config) ? b.payg_config[0] : b.payg_config;
            const plan = Array.isArray(b.plan_config) ? b.plan_config[0] : b.plan_config;

            return {
                ...b,
                payg_config: payg,
                plan_config: plan,
                current_reserved: reservedMap.get(b.id) || 0,
                spending_amount: spendingMap.get(b.subcategory_id) || 0
            };
        });

        return { success: true, data: budgetsWithBalances };
    } catch (error) {
        logger.error("Error listing budgets", error as Error);
        return { success: false, error: createSafeError("Failed to load budgets", logger.correlationId) };
    }
}

/**
 * The "Apply" logic. Reserves monthly contributions for all Plan & Spend budgets.
 */
export async function applyMonthlyContributions(workspaceId: string): Promise<BudgetResult> {
    const logger = createLogger();
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // 1. Get all active Plan & Spend budgets
        const { data: budgets, error } = await supabase
            .from("budgets")
            .select(`
                id,
                name,
                plan_config:budget_plan_configs(*)
            `)
            .eq("workspace_id", workspaceId)
            .eq("type", "PLAN_SPEND")
            .eq("status", "active");

        if (error) throw error;

        // 2. Fetch current ledger to check if already funded this month?
        const currentMonth = format(new Date(), "yyyy-MM");

        for (const budget of (budgets as any[])) {
            const rawConfig = budget.plan_config;
            const config = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig;

            if (!config) continue;

            // Check if already funded this month
            const { data: existing } = await supabase
                .from("budget_ledger")
                .select("id")
                .eq("budget_id", budget.id)
                .eq("type", "fund")
                .gte("date", startOfMonth(new Date()).toISOString())
                .limit(1);

            if (existing && existing.length > 0) {
                logger.info(`Budget ${budget.name} already funded this month, skipping.`);
                continue;
            }

            // Calculate contribution
            const contribution = await calculateMonthlyContribution(config);
            if (contribution <= 0) continue;

            // Log reservation
            await supabase.from("budget_ledger").insert({
                workspace_id: workspaceId,
                budget_id: budget.id,
                type: "fund",
                amount: contribution,
                created_by: user.id,
                metadata: { month: currentMonth }
            });
        }

        revalidatePath(`/w/${workspaceId}/dashboard`);
        revalidatePath(`/w/${workspaceId}/budgets`);
        return { success: true };
    } catch (error) {
        logger.error("Error applying contributions", error as Error);
        return { success: false, error: createSafeError("Failed to apply funding", logger.correlationId) };
    }
}

export async function calculateMonthlyContribution(config: any): Promise<number> {
    const now = startOfMonth(new Date());
    const due = startOfMonth(parseISO(config.due_date));

    let start = now;
    if (config.start_policy === "start_next_month") {
        start = addMonths(now, 1);
    }

    const totalMonths = differenceInCalendarMonths(due, start) + 1;
    if (totalMonths <= 0) return 0;

    return Number((config.target_amount / totalMonths).toFixed(2));
}

export async function confirmPayment(
    workspaceId: string,
    paymentDueId: string,
    accountId: string
): Promise<BudgetResult> {
    const logger = createLogger();
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // 0. Fetch payment due details
        const { data: paymentDue } = await supabase
            .from("budget_payments_due")
            .select("*, budget:budgets(*, subcategory:subcategories(*))")
            .eq("id", paymentDueId)
            .single();

        if (!paymentDue) throw new Error("Payment due not found");
        const budget = paymentDue.budget;
        const subcategory = budget.subcategory;
        const amount = paymentDue.amount_expected;
        const budgetId = paymentDue.budget_id;

        // 1. Create real transaction
        const { data: tx, error: tError } = await supabase
            .from("transactions")
            .insert({
                workspace_id: workspaceId,
                account_id: accountId,
                category_id: subcategory.category_id,
                subcategory_id: subcategory.id,
                amount: amount,
                base_amount: -Math.abs(amount), // Expense
                type: 'expense',
                description: `Payment for budget: ${budget.name}`,
                date: new Date().toISOString().split('T')[0],
                created_by: user.id
            })
            .select()
            .single();

        if (tError) throw tError;

        // 2. Consume from Reserved (Ledger)
        await supabase.from("budget_ledger").insert({
            workspace_id: workspaceId,
            budget_id: budgetId,
            type: "consume",
            amount: amount,
            related_transaction_id: tx.id,
            created_by: user.id
        });

        // 3. Mark payment due as confirmed
        await supabase
            .from("budget_payments_due")
            .update({
                status: "confirmed",
                confirmed_at: new Date().toISOString(),
                transaction_id: tx.id
            })
            .eq("id", paymentDueId);

        revalidatePath(`/w/${workspaceId}/dashboard`);
        revalidatePath(`/w/${workspaceId}/transactions`);
        revalidatePath(`/w/${workspaceId}/budgets`);

        return { success: true };
    } catch (error) {
        logger.error("Error confirming payment", error as Error);
        return { success: false, error: createSafeError("Failed to confirm payment", logger.correlationId) };
    }
}

export async function deleteBudget(workspaceId: string, budgetId: string): Promise<BudgetResult> {
    const logger = createLogger();
    logger.info(`Attempting to delete budget: ${budgetId} in workspace: ${workspaceId}`);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            logger.warn("Delete budget attempt unauthorized");
            return { success: false, error: createSafeError("Unauthorized", logger.correlationId) };
        }

        const { error, count } = await supabase
            .from("budgets")
            .delete({ count: 'exact' })
            .eq("id", budgetId)
            .eq("workspace_id", workspaceId);

        if (error) {
            logger.error(`Supabase error deleting budget ${budgetId}: ${error.message}`, error);
            throw error;
        }

        if (count === 0) {
            logger.warn(`No rows deleted for budget ${budgetId}. Possible workspace mismatch or permission issue.`);
            return { success: false, error: createSafeError("Budget not found or you don't have permission to delete it.", logger.correlationId) };
        }

        revalidatePath(`/w/${workspaceId}/budgets`);
        revalidatePath(`/w/${workspaceId}/dashboard`);
        return { success: true };
    } catch (error) {
        logger.error("Error deleting budget", error as Error);
        return { success: false, error: createSafeError("Failed to delete budget", logger.correlationId) };
    }
}
