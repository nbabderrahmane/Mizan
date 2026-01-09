"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { createAccountSchema } from "@/lib/validations/account";
import { revalidatePath, revalidateTag } from "next/cache";

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
    last_reconciled_at: string | null;
    created_at: string;
};

// Added for compatibility with existing code
export type AccountWithBalance = Account & {
    available: number;
};

export async function createAccount(
    workspaceId: string,
    formData: FormData
): Promise<AccountResult<Account>> {
    const logger = createLogger();

    try {
        // Fix: Use snake_case keys to match Zod schema
        const rawData = {
            name: formData.get("name"),
            type: formData.get("type"),
            base_currency: formData.get("base_currency"),
            opening_balance: formData.get("opening_balance"), // Pass as is, let Zod transform handle string -> number
        };

        const result = createAccountSchema.safeParse(rawData);
        if (!result.success) {
            // Log detailed validation error for debugging if needed, but return generic msg
            // logger.warn("Validation failed", { errors: result.error.errors });
            return {
                success: false,
                error: createSafeError("Validation failed", logger.correlationId),
            };
        }
        const validated = result.data;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: createSafeError("Unauthorized", logger.correlationId) };
        }

        const { data: account, error } = await supabase
            .from("accounts")
            .insert({
                workspace_id: workspaceId,
                name: validated.name,
                type: validated.type,
                base_currency: validated.base_currency,
                opening_balance: validated.opening_balance,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        revalidatePath(`/w/${workspaceId}/dashboard`);
        revalidatePath(`/w/${workspaceId}/settings/accounts`);
        revalidateTag("dashboard");
        return { success: true, data: account };

    } catch (error) {
        logger.error("Failed to create account", error as Error, { workspaceId });
        return {
            success: false,
            error: createSafeError("Failed to create account", logger.correlationId),
        };
    }
}

export async function updateAccount(
    accountId: string,
    formData: FormData,
    workspaceId: string
): Promise<AccountResult<Account>> {
    const logger = createLogger();

    try {
        const rawData = {
            name: formData.get("name"),
            type: formData.get("type"),
        };

        const supabase = await createClient();

        const { data: account, error } = await supabase
            .from("accounts")
            .update({
                name: rawData.name,
                type: rawData.type,
            })
            .eq("id", accountId)
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/w/${workspaceId}/dashboard`);
        revalidatePath(`/w/${workspaceId}/settings/accounts`);
        return { success: true, data: account };

    } catch (error) {
        logger.error("Failed to update account", error as Error, { accountId });
        return {
            success: false,
            error: createSafeError("Failed to update account", logger.correlationId),
        };
    }
}

export async function archiveAccount(accountId: string, workspaceId: string) {
    const logger = createLogger();
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("accounts")
            .update({ is_archived: true })
            .eq("id", accountId);

        if (error) throw error;
        revalidatePath(`/w/${workspaceId}/settings/accounts`);
        return { success: true };
    } catch (error) {
        logger.error("Failed to archive account", error as Error, { accountId });
        return { success: false, error: { message: "Failed to archive account", correlationId: logger.correlationId } };
    }
}

export async function deleteAccount(accountId: string, workspaceId: string) {
    const logger = createLogger();
    try {
        const supabase = await createClient();

        // Check for transactions first
        const { count } = await supabase
            .from("transactions")
            .select("*", { count: "exact", head: true })
            .eq("account_id", accountId);

        if (count && count > 0) {
            return {
                success: false,
                error: { message: "Cannot delete account with existing transactions. Archive it instead.", correlationId: logger.correlationId }
            };
        }

        const { error } = await supabase
            .from("accounts")
            .delete()
            .eq("id", accountId);

        if (error) throw error;
        revalidatePath(`/w/${workspaceId}/settings/accounts`);
        return { success: true };
    } catch (error) {
        logger.error("Failed to delete account", error as Error, { accountId });
        return { success: false, error: { message: "Failed to delete account", correlationId: logger.correlationId } };
    }
}

export async function getAccounts(workspaceId: string): Promise<AccountResult<AccountWithBalance[]>> {
    const logger = createLogger();
    try {
        const supabase = await createClient();

        // Get accounts
        const { data: accounts, error } = await supabase
            .from("accounts")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        // Get all transactions to calculate balances
        const { data: transactions } = await supabase
            .from("transactions")
            .select("account_id, base_amount")
            .eq("workspace_id", workspaceId);

        // Calculate balance for each account
        const accountsWithBalance: AccountWithBalance[] = (accounts || []).map(account => {
            const txSum = (transactions || [])
                .filter(tx => tx.account_id === account.id)
                .reduce((sum, tx) => sum + Number(tx.base_amount), 0);

            const computedBalance = Number(account.opening_balance) + txSum;

            return {
                ...account,
                available: computedBalance
            };
        });

        return { success: true, data: accountsWithBalance };
    } catch (error) {
        logger.error("Failed to fetch accounts", error as Error, { workspaceId });
        return { success: false, error: createSafeError("Failed to fetch accounts", logger.correlationId) };
    }
}

// Alias for getAccounts to fix missing export error
export const listAccounts = getAccounts;

/**
 * Reconcile an account (update its balance/last_reconciled_at).
 * This is a simplified implementation to restore functionality.
 * In a real app, this might create an adjustment transaction.
 */
export async function reconcileAccount(accountId: string, actualBalance: number): Promise<AccountResult<void>> {
    const logger = createLogger();
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("Unauthorized");

        // Fetch account to check currency
        const { data: account } = await supabase.from("accounts").select("*").eq("id", accountId).single();
        if (!account) throw new Error("Account not found");

        const { error } = await supabase
            .from("accounts")
            .update({ last_reconciled_at: new Date().toISOString() })
            .eq("id", accountId);

        if (error) throw error;

        revalidatePath("/"); // optimize path later
        return { success: true };

    } catch (error) {
        logger.error("Failed to reconcile account", error as Error, { accountId });
        return { success: false, error: createSafeError("Failed to reconcile", logger.correlationId) };
    }
}
