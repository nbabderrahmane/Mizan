import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "date-fns";
import { calculateMonthlyContribution } from "../actions/budget";
import { getFxRate } from "@/lib/services/fx";
import { SupabaseClient } from "@supabase/supabase-js";

export type DashboardStats = {
    hasAccounts: boolean;
    hasCategories: boolean;
    hasBudgets: boolean;
    hasTransactions: boolean;
    expensesByCategory: { name: string; value: number; color: string }[];
    totalBalance: number;
    availableCash: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    reservedTotal: number;
    dueThisMonth: number;
    pendingPaymentsCount: number;
    pendingPayments: any[];
};

/**
 * Fetch dashboard stats using RPC.
 * Allows passing a specific SupabaseClient (e.g., admin client for cached calls)
 * to avoid cookie access in unstable_cache.
 */
export async function getDashboardStats(
    workspaceId: string,
    supabaseClient?: SupabaseClient
): Promise<DashboardStats> {
    const supabase = supabaseClient || await createClient();

    // 1. Fetch Workspace Info (to know target currency)
    const { data: workspace } = await supabase
        .from("workspaces")
        .select("currency")
        .eq("id", workspaceId)
        .single();

    const targetCurrency = workspace?.currency || "USD";

    // 2. Fetch Accounts with Transactions to calculate balance
    // We calculate balance as opening_balance + sum(transactions.base_amount)
    // We fetch this in one go to be efficient and correct.
    // 2. Fetch Accounts and Transactions separately
    // This mirrors the logic in account.ts which is known to work.
    const { data: accounts, error: accError } = await supabase
        .from("accounts")
        .select("id, name, base_currency, opening_balance")
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false);

    if (accError) {
        // console.error("[Dashboard Debug] Error fetching accounts:", accError);
    } else {
        // console.log(`[Dashboard Debug] Fetched ${accounts?.length} accounts`);
    }

    // Fetch transactions for these accounts (or all workspace transactions to be safe)
    const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("account_id, base_amount")
        .eq("workspace_id", workspaceId);

    if (txError) {
        // console.error("[Dashboard Debug] Error fetching transactions:", txError);
    }

    let totalBalance = 0;

    if (accounts) {
        const txMap = new Map<string, number>();
        // Group transactions by account
        if (transactions) {
            for (const tx of transactions) {
                const current = txMap.get(tx.account_id) || 0;
                txMap.set(tx.account_id, current + Number(tx.base_amount));
            }
        }

        for (const acc of accounts) {
            const txSum = txMap.get(acc.id) || 0;
            const nativeBalance = Number(acc.opening_balance || 0) + txSum;

            const rate = await getFxRate(acc.base_currency, targetCurrency, supabase);
            totalBalance += nativeBalance * rate;
        }
    }

    // 3. Monthly Income/Expenses
    const startOfMonthDate = startOfMonth(new Date()).toISOString();

    // Fetch aggregated income/expenses by currency
    // Use SQL to group by currency to minimize FX calls
    const { data: monthlyTx } = await supabase
        .from("transactions")
        .select("type, base_amount, currency") // Assuming transaction has currency column or we join accounts
        // Transactions usually have `amount` (transaction currency) and `base_amount` (account currency).
        // To be precise, we should use `base_amount` and the `account.base_currency`.
        .select(`
            type,
            base_amount,
            account:accounts!inner(base_currency)
        `)
        .eq("workspace_id", workspaceId)
        .gte("date", startOfMonthDate);

    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    if (monthlyTx) {
        // Group by [Type, Currency]
        const sums: Record<string, number> = {};

        for (const tx of monthlyTx) {
            const acc = (tx.account as any);
            const currency = acc?.base_currency || targetCurrency;
            const key = `${tx.type}|${currency}`;
            sums[key] = (sums[key] || 0) + Math.abs(Number(tx.base_amount));
        }

        // Convert and Aggregate
        for (const [key, amount] of Object.entries(sums)) {
            const [type, currency] = key.split("|");
            const rate = await getFxRate(currency, targetCurrency, supabase);
            const converted = amount * rate;

            if (type === "income") monthlyIncome += converted;
            if (type === "expense") monthlyExpenses += converted;
            // Handle transfers if needed (usually net zero overall, but separated here)
            // Original dashboard logic separates them. We'll stick to income/expense types.
        }
    }

    // 4. Expenses by Category
    // We need to fetch Expenses joined with Categories and Accounts (for currency)
    const { data: catExpenses } = await supabase
        .from("transactions")
        .select(`
            base_amount,
            category:categories(name),
            account:accounts(base_currency)
        `)
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("date", startOfMonthDate);

    const categoryMap = new Map<string, number>();

    if (catExpenses) {
        for (const tx of catExpenses) {
            const catName = (tx.category as any)?.name || "Uncategorized";
            const currency = (tx.account as any)?.base_currency || targetCurrency;
            const amount = Math.abs(Number(tx.base_amount));

            const rate = await getFxRate(currency, targetCurrency, supabase);
            const converted = amount * rate;

            categoryMap.set(catName, (categoryMap.get(catName) || 0) + converted);
        }
    }

    const expensesByCategory = Array.from(categoryMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
    })).sort((a, b) => b.value - a.value);


    // 5. Counts (Cheap)
    const { count: accountCount } = await supabase.from("accounts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("is_archived", false);
    const { count: categoryCount } = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    const { count: budgetCount } = await supabase.from("budgets").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    const { count: transactionCount } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);

    // 6. Reserved (Budgets)
    // Budget ledger is usually in budget's currency.
    // We need to convert it too.
    const { data: ledgerEntries } = await supabase
        .from("budget_ledger")
        .select("type, amount, budget:budgets(currency)")
        .eq("workspace_id", workspaceId);

    let reservedTotal = 0;
    if (ledgerEntries) {
        for (const entry of ledgerEntries) {
            const currency = (entry.budget as any)?.currency || targetCurrency;
            const val = Number(entry.amount);
            const rate = await getFxRate(currency, targetCurrency, supabase);
            const converted = val * rate;

            if (entry.type === 'fund' || entry.type === 'adjust') reservedTotal += converted;
            else reservedTotal -= converted;
        }
    }

    return {
        hasAccounts: (accountCount ?? 0) > 0,
        hasCategories: (categoryCount ?? 0) > 0,
        hasBudgets: (budgetCount ?? 0) > 0,
        hasTransactions: (transactionCount ?? 0) > 0,
        expensesByCategory,
        totalBalance,
        availableCash: totalBalance - reservedTotal,
        monthlyIncome,
        monthlyExpenses,
        reservedTotal,
        dueThisMonth: 0,
        pendingPaymentsCount: 0,
        pendingPayments: [],
    };
}

export async function getBalanceHistory(
    workspaceId: string,
    range: "7d" | "30d" | "90d" | "1y" | "mtd" = "30d",
    accountId?: string,
    supabaseClient?: SupabaseClient
): Promise<{ date: string; balance: number }[]> {
    const supabase = supabaseClient || await createClient();

    // Calculate dates
    const today = new Date();
    let startDate = new Date();

    if (range === "7d") startDate.setDate(today.getDate() - 7);
    if (range === "30d") startDate.setDate(today.getDate() - 30);
    if (range === "90d") startDate.setDate(today.getDate() - 90);
    if (range === "1y") startDate.setDate(today.getDate() - 365);
    if (range === "mtd") startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    const startDateStr = startDate.toISOString();

    // Call RPC
    const { data, error } = await supabase.rpc('get_balance_history', {
        p_workspace_id: workspaceId,
        p_start_date: startDateStr
    });

    if (error) {
        console.error("RPC Error (get_balance_history):", error);
        return [];
    }

    return (data as any[] || []).map((d: any) => ({
        date: d.day,
        balance: Number(d.balance)
    }));
}
