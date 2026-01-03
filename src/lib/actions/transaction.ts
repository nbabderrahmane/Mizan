"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { createTransactionSchema } from "@/lib/validations/transaction";
import { revalidatePath } from "next/cache";

export type TransactionResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

export type Transaction = {
    id: string;
    workspace_id: string;
    account_id: string;
    created_by: string;
    type: "income" | "expense" | "transfer";
    date: string;
    description: string | null;
    title: string | null;
    vendor: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    transfer_account_id: string | null;
    original_amount: number;
    original_currency: string;
    fx_rate_used: number | null;
    base_amount: number;
    created_at: string;

    // Joins
    category?: { name: string; color?: string } | null;
    account?: { name: string; base_currency: string; last_reconciled_at?: string | null } | null;
    transfer_account?: { name: string; base_currency: string } | null;
};

export async function createTransaction(
    workspaceId: string,
    formData: FormData
): Promise<TransactionResult<Transaction | Transaction[]>> {
    const logger = createLogger();

    try {
        const rawData = {
            type: formData.get("type"),
            accountId: formData.get("accountId"),
            date: formData.get("date"),
            amount: parseFloat(formData.get("amount") as string),
            currency: formData.get("currency"),
            title: formData.get("title"),
            vendor: formData.get("vendor"),
            description: formData.get("description"),
            categoryId: formData.get("categoryId") || undefined,
            subcategoryId: formData.get("subcategoryId") || undefined,
            transferAccountId: formData.get("transferAccountId") || undefined,
            fxRate: formData.get("fxRate") ? parseFloat(formData.get("fxRate") as string) : undefined,
        };

        const validated = createTransactionSchema.parse(rawData);
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Verify Workspace Access
        const { data: member } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return {
                success: false,
                error: createSafeError("Access denied.", logger.correlationId),
            };
        }

        // Get Account Details
        const { data: account } = await supabase
            .from("accounts")
            .select("base_currency")
            .eq("id", validated.accountId)
            .single();

        if (!account) {
            return {
                success: false,
                error: createSafeError("Account not found.", logger.correlationId),
            };
        }

        // FX logic
        let baseAmount = validated.amount;
        let finalFxRate = validated.fxRate;
        const isForeign = validated.currency !== account.base_currency;

        if (isForeign) {
            if (!validated.fxRate) {
                const { getFxRate } = await import("@/lib/services/fx");
                try {
                    finalFxRate = await getFxRate(validated.currency, account.base_currency);
                } catch (fxError) {
                    return {
                        success: false,
                        error: createSafeError("Unable to fetch exchange rate.", logger.correlationId),
                    };
                }
            }
            baseAmount = validated.amount * (finalFxRate || 1);
        }

        const sign = validated.type === "income" ? 1 : -1;
        const signedBaseAmount = baseAmount * sign;

        const transactionData = {
            workspace_id: workspaceId,
            account_id: validated.accountId,
            created_by: user.id,
            attributed_to_user_id: user.id,
            type: validated.type,
            date: validated.date,
            description: validated.description,
            title: validated.title || null,
            vendor: validated.vendor || null,
            category_id: validated.categoryId || null,
            subcategory_id: validated.subcategoryId || null,
            transfer_account_id: validated.transferAccountId || null,
            original_amount: validated.amount,
            original_currency: validated.currency,
            fx_rate_used: finalFxRate || null,
            base_amount: signedBaseAmount,
        };

        const { data: transaction, error } = await supabase
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();

        if (error) throw error;

        // Handle Transfer Target
        if (validated.type === "transfer" && validated.transferAccountId) {
            const { data: targetAccount } = await supabase
                .from("accounts")
                .select("base_currency")
                .eq("id", validated.transferAccountId)
                .single();

            if (targetAccount && targetAccount.base_currency === validated.currency) {
                const targetTxData = {
                    workspace_id: workspaceId,
                    account_id: validated.transferAccountId,
                    created_by: user.id,
                    type: "transfer",
                    date: validated.date,
                    description: `Transfer from ${account.base_currency} Account`,
                    transfer_account_id: validated.accountId,
                    original_amount: validated.amount,
                    original_currency: validated.currency,
                    base_amount: validated.amount, // Inflow
                };
                await supabase.from("transactions").insert(targetTxData);
            }
        }

        revalidatePath(`/w/${workspaceId}/dashboard`);
        revalidatePath(`/w/${workspaceId}/transactions`);
        return { success: true, data: transaction };

    } catch (error) {
        logger.error("Error creating transaction", error as Error);
        return {
            success: false,
            error: createSafeError("Failed to create transaction.", logger.correlationId),
        };
    }
}

export async function updateTransaction(
    transactionId: string,
    formData: FormData,
    workspaceId: string
): Promise<TransactionResult<Transaction>> {
    const logger = createLogger();
    try {
        const rawData = {
            type: formData.get("type"),
            accountId: formData.get("accountId"),
            date: formData.get("date"),
            amount: parseFloat(formData.get("amount") as string),
            currency: formData.get("currency"),
            title: formData.get("title"),
            vendor: formData.get("vendor"),
            description: formData.get("description"),
            categoryId: formData.get("categoryId") || undefined,
            subcategoryId: formData.get("subcategoryId") || undefined,
            transferAccountId: formData.get("transferAccountId") || undefined,
            fxRate: formData.get("fxRate") ? parseFloat(formData.get("fxRate") as string) : undefined,
        };

        const validated = createTransactionSchema.parse(rawData);
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("Unauthorized");

        const { data: account } = await supabase
            .from("accounts")
            .select("base_currency, last_reconciled_at")
            .eq("id", validated.accountId)
            .single();

        if (!account) throw new Error("Account not found");

        // Lock Check
        if (account.last_reconciled_at) {
            const frozenDateStr = new Date(account.last_reconciled_at).toISOString().slice(0, 10);
            if (validated.date < frozenDateStr) {
                return { success: false, error: createSafeError("This period is locked.", logger.correlationId) };
            }
        }

        let baseAmount = validated.amount;
        let finalFxRate = validated.fxRate;
        const isForeign = validated.currency !== account.base_currency;

        if (isForeign && !validated.fxRate) {
            const { getFxRate } = await import("@/lib/services/fx");
            finalFxRate = await getFxRate(validated.currency, account.base_currency);
            baseAmount = validated.amount * (finalFxRate || 1);
        } else if (validated.fxRate) {
            baseAmount = validated.amount * validated.fxRate;
        }

        const sign = validated.type === "income" ? 1 : -1;
        const signedBaseAmount = baseAmount * sign;

        const { data: transaction, error: updateError } = await supabase
            .from("transactions")
            .update({
                account_id: validated.accountId,
                type: validated.type,
                date: validated.date,
                description: validated.description,
                category_id: validated.categoryId || null,
                subcategory_id: validated.subcategoryId || null,
                transfer_account_id: validated.transferAccountId || null,
                original_amount: validated.amount,
                original_currency: validated.currency,
                fx_rate_used: finalFxRate || null,
                base_amount: signedBaseAmount,
            })
            .eq("id", transactionId)
            .select()
            .single();

        if (updateError) throw updateError;

        revalidatePath(`/w/${workspaceId}/dashboard`);
        revalidatePath(`/w/${workspaceId}/transactions`);
        return { success: true, data: transaction };

    } catch (error) {
        logger.error("Error updating transaction", error as Error);
        return { success: false, error: createSafeError("Failed to update transaction.", logger.correlationId) };
    }
}

export async function deleteTransaction(transactionId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
    if (error) return { success: false, error: { message: error.message } };
    revalidatePath("/", "layout");
    return { success: true };
}

export async function getTransactions(
    workspaceId: string,
    filters?: any
): Promise<TransactionResult<Transaction[]>> {
    const supabase = await createClient();
    let query = supabase
        .from("transactions")
        .select(`
            *,
            category:categories(name),
            account:accounts!transactions_account_id_fkey(name, base_currency, last_reconciled_at),
            transfer_account:accounts!transactions_transfer_account_id_fkey(name, base_currency)
        `)
        .eq("workspace_id", workspaceId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

    if (filters?.startDate && filters?.endDate) {
        query = query.gte("date", filters.startDate).lte("date", filters.endDate);
    }

    if (filters?.accountId) query = query.eq("account_id", filters.accountId);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: { message: error.message, correlationId: "" } };

    return { success: true, data: data as Transaction[] };
}

export async function getUniqueVendors(workspaceId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("transactions")
        .select("vendor")
        .eq("workspace_id", workspaceId)
        .not("vendor", "is", null);

    if (!data) return [];
    return Array.from(new Set(data.map(d => d.vendor).filter(Boolean))) as string[];
}
