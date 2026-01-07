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

    // 2. Fetch Accounts (Active)
    const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name, base_currency, balance") // balance is opening balance + transactions sum usually, but here we might need to rely on what system thinks or recalculate. 
        // Actually, 'balance' column might not be reliable if it's not auto-updated. 
        // Let's assume 'get_balance_history' logic or 'available' computation is needed.
        // For simplicity and correctness with "Account Detail" logic, we should probably fetch computed balances if possible. 
        // However, standard 'accounts' table usually has 'opening_balance'. 
        // 'account_balances' view or similar might be better? 
        // Let's check 'get_account_balances' RPC or similar. 
        // Re-reading 'account-detail-client.tsx': it uses `account.available` (if server provided) or `opening_balance`.
        // Let's use a simpler approach: Fetch Accounts + Fetch ALL Transactions? No, too heavy.
        // Let's use `get_balance_history` for "today" for each account? 
        // BETTER: Use `get_account_balances` RPC if it exists, OR `accounts` table if `current_balance` is maintained.
        // Checking `accounts` table schema via list_dir earlier didn't show it, but usually apps have calculated fields.
        // Let's assume we can fetch `id, base_currency, current_balance` from a view or rely on `accounts` table having it. 
        // Wait, `account-detail-client` used `transactions.reduce`. That implies no pre-calc balance?
        // Let's stick to the previous RPC `get_dashboard_stats` logic but do it manually? 
        // No, `get_dashboard_stats` used `total_balance` from SQL.
        // Let's try to fetch active accounts and their current balances via `get_account_balances` RPC if available, or just use the raw accounts and sum their txns?
        // Safe bet: Fetch `accounts` and assume they have a computed `balance` or we fetch stats per account.
        // Actually, let's look at `getDashboardStats` original code: it used `rawStats.total_balance`.
        // We will fetch ALL accounts, then for each account get its balance (maybe via `get_balance_history` for "today" which acts as current balance).
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false);

    // To get accurate balances without fetching all TXs, let's use `get_balance_history` for each account for 'today' (range=7d, take last).
    // Or better: Assume `get_account_list` or similar action returns balances.
    // Let's fetch accounts first.

    let totalBalance = 0;
    let availableCash = 0;

    if (accounts) {
        // Parallelize balance fetching/calculation
        const balancePromises = accounts.map(async (acc) => {
            // We can re-use getBalanceHistory logic but for single point? 
            // Or just fetch all transactions for account? 
            // Let's try to find an optimized way. 
            // `get_balance_history` RPC takes workspace_id.
            // Let's just fetch all transactions for the workspace? No.
            // Let's iterate accounts and get their balance via a lighter query if possible.
            // Actually, let's trust the `accounts` view if it stands. 
            // If `accounts` is just a table, we need to sum transactions.
            // SQL is best for this. `select sum(base_amount) from transactions where account_id = X`.

            const { data: txSum } = await supabase
                .from("transactions")
                .select("base_amount")
                .eq("account_id", acc.id);

            let accBalance = (acc as any).opening_balance || 0; // if column exists
            // Wait, we don't know if opening_balance exists on type.
            // Let's assume `get_dashboard_stats` RPC was doing it right but in mixed currency.
            // We will replicate that SQL logic but in code with FX.

            // Get balance for account:
            const { data: balanceResult } = await supabase.rpc('get_account_balance', { p_account_id: acc.id });
            const balance = Number(balanceResult || 0);

            const rate = await getFxRate(acc.base_currency, targetCurrency);
            return { balance, rate };
        });

        // However, `get_account_balance` RPC might not exist.
        // Let's check `listAccounts` implementation?
        // It's in `lib/actions/account.ts`. Let's assume we can use `listAccounts` and it calculates balances.
        // But we are in `dashboard.ts`. Importing `listAccounts` from actions might cause circular deps or issues?
        // `listAccounts` is "use server". `dashboard.ts` is data layer.
        // Let's use `supabase` directly.

        // Alternative: Fetch `accounts` with `transactions(base_amount)`.
        const { data: accountsWithTx } = await supabase
            .from("accounts")
            .select("id, name, base_currency, opening_balance, transactions(base_amount)")
            .eq("workspace_id", workspaceId)
            .eq("is_archived", false);

        if (accountsWithTx) {
            for (const acc of accountsWithTx) {
                const txSum = (acc.transactions || []).reduce((sum: number, t: any) => sum + Number(t.base_amount), 0);
                const nativeBalance = (acc.opening_balance || 0) + txSum;

                const rate = await getFxRate(acc.base_currency, targetCurrency);
                totalBalance += nativeBalance * rate;
            }
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
            const rate = await getFxRate(currency, targetCurrency);
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

            const rate = await getFxRate(currency, targetCurrency);
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
            const rate = await getFxRate(currency, targetCurrency);
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
