"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { createAccountSchema, updateAccountSchema } from "@/lib/validations/account";
import { revalidatePath } from "next/cache";

export type AccountResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

export type Account = {
    id: string;
    workspace_id: string;
    name: string;
    type: "bank" | "cash" | "savings" | "investment";
    base_currency: string;
    opening_balance: number;
    is_archived: boolean;
    last_reconciled_at?: string | null;
    created_at: string;
};

export type AccountWithBalance = Account & {
    balance: number;
    reserved: number;
    available: number;
};

/**
 * Create a new account in a workspace.
 * Only OWNER/MANAGER can create accounts.
 */
export async function createAccount(
    workspaceId: string,
    formData: FormData
): Promise<AccountResult<Account>> {
    const logger = createLogger();
    logger.info("createAccount action started", { action: "createAccount", workspaceId });

    try {
        const rawData = {
            name: formData.get("name") as string,
            type: formData.get("type") as string,
            base_currency: formData.get("base_currency") as string,
            opening_balance: parseFloat(formData.get("opening_balance") as string) || 0,
        };

        // Validate input
        const validatedData = createAccountSchema.parse(rawData);
        logger.debug("Input validated", { action: "createAccount" });

        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.error("User not authenticated", userError ? new Error(userError.message) : undefined, {
                action: "createAccount",
            });
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Check user can manage workspace (OWNER/MANAGER)
        const { data: canManage } = await supabase.rpc("can_manage_workspace", {
            ws_id: workspaceId,
        });

        if (!canManage) {
            logger.warn("User cannot manage workspace", {
                action: "createAccount",
                userId: user.id,
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError(
                    "You don't have permission to create accounts.",
                    logger.correlationId
                ),
            };
        }

        // Create account
        const { data: account, error: insertError } = await supabase
            .from("accounts")
            .insert({
                workspace_id: workspaceId,
                name: validatedData.name,
                type: validatedData.type,
                base_currency: validatedData.base_currency,
                opening_balance: validatedData.opening_balance,
            })
            .select()
            .single();

        if (insertError) {
            logger.error("Failed to create account", new Error(insertError.message), {
                action: "createAccount",
                userId: user.id,
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("Failed to create account.", logger.correlationId),
            };
        }

        logger.info("Account created successfully", {
            action: "createAccount",
            userId: user.id,
            workspaceId,
            accountId: account.id,
        });

        // Create audit log
        await supabase.rpc("create_audit_log", {
            p_workspace_id: workspaceId,
            p_action: "create",
            p_entity_type: "account",
            p_entity_id: account.id,
            p_payload_public: { name: account.name, type: account.type },
        });

        revalidatePath(`/w/${workspaceId}/accounts`);
        return { success: true, data: account };
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            logger.warn("Validation failed", { action: "createAccount" });
            return {
                success: false,
                error: createSafeError("Please check your input.", logger.correlationId),
            };
        }

        logger.error("Unexpected error", error as Error, { action: "createAccount" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Update an account.
 * Only OWNER/MANAGER can update accounts.
 */
export async function updateAccount(
    accountId: string,
    formData: FormData
): Promise<AccountResult<Account>> {
    const logger = createLogger();
    logger.info("updateAccount action started", { action: "updateAccount", accountId });

    try {
        const rawData: Record<string, unknown> = {};
        const name = formData.get("name");
        const isArchived = formData.get("is_archived");
        const openingBalance = formData.get("opening_balance");

        if (name) rawData.name = name;
        if (isArchived !== null) rawData.is_archived = isArchived === "true";
        if (openingBalance !== null) rawData.opening_balance = parseFloat(openingBalance as string);

        const validatedData = updateAccountSchema.parse(rawData);
        logger.debug("Input validated", { action: "updateAccount" });

        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.error("User not authenticated", userError ? new Error(userError.message) : undefined, {
                action: "updateAccount",
            });
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Get account to check workspace
        const { data: existingAccount, error: fetchError } = await supabase
            .from("accounts")
            .select("workspace_id")
            .eq("id", accountId)
            .single();

        if (fetchError || !existingAccount) {
            logger.warn("Account not found", { action: "updateAccount", accountId });
            return {
                success: false,
                error: createSafeError("Account not found.", logger.correlationId),
            };
        }

        // Update account
        const { data: account, error: updateError } = await supabase
            .from("accounts")
            .update(validatedData)
            .eq("id", accountId)
            .select()
            .single();

        if (updateError) {
            logger.error("Failed to update account", new Error(updateError.message), {
                action: "updateAccount",
                accountId,
            });
            return {
                success: false,
                error: createSafeError("Failed to update account.", logger.correlationId),
            };
        }

        logger.info("Account updated successfully", {
            action: "updateAccount",
            userId: user.id,
            accountId,
        });

        revalidatePath(`/w/${existingAccount.workspace_id}/accounts`);
        revalidatePath(`/w/${existingAccount.workspace_id}/dashboard`);
        return { success: true, data: account };
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            logger.warn("Validation failed", { action: "updateAccount" });
            return {
                success: false,
                error: createSafeError("Please check your input.", logger.correlationId),
            };
        }

        logger.error("Unexpected error", error as Error, { action: "updateAccount" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}



/**
 * Reconcile account balance.
 * Calculates the difference between actual (user provided) and system balance,
 * then creates an adjustment transaction.
 */
export async function reconcileAccount(
    accountId: string,
    actualBalance: number,
    reconciledAt: string = new Date().toISOString()
): Promise<AccountResult<{ adjustment: number; transactionId: string }>> {
    const logger = createLogger();
    logger.info("reconcileAccount action started", { action: "reconcileAccount", accountId, actualBalance });

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: createSafeError("You must be logged in.", logger.correlationId) };
        }

        const { data: account } = await supabase.from("accounts").select("*").eq("id", accountId).single();
        if (!account) return { success: false, error: createSafeError("Account not found", logger.correlationId) };

        // 1. Get current system balance
        const { data: balanceData } = await supabase.rpc("get_account_balance", { p_account_id: accountId });
        const currentSystemBalance = balanceData ?? account.opening_balance;

        // 2. Calculate diff
        const diff = actualBalance - currentSystemBalance;

        // NEW: Always update last_reconciled_at even if diff is 0?
        // User wants to lock transactions. So yes, reconciling confirms balance at time X.
        // So we update the timestamp.

        await supabase
            .from("accounts")
            .update({ last_reconciled_at: reconciledAt })
            .eq("id", accountId);

        if (diff === 0) {
            revalidatePath(`/w/${account.workspace_id}/accounts`);
            revalidatePath(`/w/${account.workspace_id}/dashboard`);
            return { success: true, data: { adjustment: 0, transactionId: "" } };
        }

        // 3. Create adjustment transaction
        // If diff is positive (Actual > System) => Income
        // If diff is negative (Actual < System) => Expense (we store absolute value as amount)
        const type = diff > 0 ? "income" : "expense";
        const amount = Math.abs(diff);

        // Sign logic logic repeats from createTransaction, but simpler here
        const baseAmount = diff; // This is the signed amount we want to add to balance

        const transactionData = {
            workspace_id: account.workspace_id,
            account_id: accountId,
            created_by: user.id,
            type: type, // 'income' or 'expense'
            date: reconciledAt.slice(0, 10), // Store DATE part for transaction date
            description: "Balance Adjustment / Reconciliation",
            original_amount: amount,
            original_currency: account.base_currency,
            base_amount: baseAmount,
        };

        const { data: transaction, error: insertError } = await supabase
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();

        if (insertError) throw insertError;

        revalidatePath(`/w/${account.workspace_id}/accounts`);
        revalidatePath(`/w/${account.workspace_id}/dashboard`);

        return { success: true, data: { adjustment: diff, transactionId: transaction.id } };

    } catch (error) {
        logger.error("Reconciliation failed", error as Error, { action: "reconcileAccount" });
        return { success: false, error: createSafeError("Reconciliation failed.", logger.correlationId) };
    }
}

/**
 * Archive an account (soft delete).
 */
export async function archiveAccount(accountId: string): Promise<AccountResult<void>> {
    const formData = new FormData();
    formData.set("is_archived", "true");
    const result = await updateAccount(accountId, formData);
    return { success: result.success, error: result.error };
}

/**
 * List all accounts in a workspace with computed balances.
 */
export async function listAccounts(
    workspaceId: string
): Promise<AccountResult<AccountWithBalance[]>> {
    const logger = createLogger();
    logger.debug("listAccounts action started", { action: "listAccounts", workspaceId });

    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.warn("User not authenticated", { action: "listAccounts" });
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Get accounts
        const { data: accounts, error: fetchError } = await supabase
            .from("accounts")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("is_archived", false)
            .order("created_at", { ascending: true });

        if (fetchError) {
            logger.error("Failed to fetch accounts", new Error(fetchError.message), {
                action: "listAccounts",
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("Failed to load accounts.", logger.correlationId),
            };
        }

        // Get balances for each account using database functions
        const accountsWithBalance: AccountWithBalance[] = await Promise.all(
            (accounts || []).map(async (account) => {
                const [balanceResult, reservedResult] = await Promise.all([
                    supabase.rpc("get_account_balance", { p_account_id: account.id }),
                    supabase.rpc("get_account_reserved", { p_account_id: account.id }),
                ]);

                const balance = balanceResult.data ?? account.opening_balance;
                const reserved = reservedResult.data ?? 0;

                return {
                    ...account,
                    balance,
                    reserved,
                    available: balance - reserved,
                };
            })
        );

        logger.debug("Accounts fetched successfully", {
            action: "listAccounts",
            workspaceId,
            count: accountsWithBalance.length,
        });

        return { success: true, data: accountsWithBalance };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "listAccounts" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Get a single account with computed balance.
 */
export async function getAccount(
    accountId: string
): Promise<AccountResult<AccountWithBalance>> {
    const logger = createLogger();
    logger.debug("getAccount action started", { action: "getAccount", accountId });

    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.warn("User not authenticated", { action: "getAccount" });
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Get account
        const { data: account, error: fetchError } = await supabase
            .from("accounts")
            .select("*")
            .eq("id", accountId)
            .single();

        if (fetchError || !account) {
            logger.warn("Account not found", { action: "getAccount", accountId });
            return {
                success: false,
                error: createSafeError("Account not found.", logger.correlationId),
            };
        }

        // Get balance
        const [balanceResult, reservedResult] = await Promise.all([
            supabase.rpc("get_account_balance", { p_account_id: accountId }),
            supabase.rpc("get_account_reserved", { p_account_id: accountId }),
        ]);

        const balance = balanceResult.data ?? account.opening_balance;
        const reserved = reservedResult.data ?? 0;

        logger.debug("Account fetched successfully", {
            action: "getAccount",
            accountId,
        });

        return {
            success: true,
            data: {
                ...account,
                balance,
                reserved,
                available: balance - reserved,
            },
        };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "getAccount" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}
