import { createClient } from "@/lib/supabase/server";
import { startOfMonth } from "date-fns";
import { calculateMonthlyContribution } from "../actions/budget";
import { getFxRate } from "@/lib/services/fx";

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

export async function getDashboardStats(workspaceId: string): Promise<DashboardStats> {
    const supabase = await createClient();

    // 1. Fetch Workspace Currency
    const { data: workspace } = await supabase.from("workspaces").select("currency").eq("id", workspaceId).single();
    const workspaceCurrency = workspace?.currency || "USD";

    // 2. Fetch Accounts
    const { count: accountCount, data: accounts } = await supabase
        .from("accounts")
        .select("id, opening_balance, base_currency")
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false);

    const { count: categoryCount } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

    const { count: budgetCount } = await supabase
        .from("budgets")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

    // 3. Ledger with Currency
    const { data: ledgerEntries } = await supabase
        .from("budget_ledger")
        .select("type, amount, budget:budgets(currency)")
        .eq("workspace_id", workspaceId);

    const { count: transactionCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

    // 4. PREPARE FX RATES
    // Collect all unique currencies needed
    const currencies = new Set<string>();
    currencies.add(workspaceCurrency); // Ensure base is there (rate 1)
    accounts?.forEach(a => currencies.add(a.base_currency || "USD"));
    ledgerEntries?.forEach((e: any) => currencies.add(e.budget?.currency || "USD"));

    const rates = new Map<string, number>();
    await Promise.all(Array.from(currencies).map(async (curr) => {
        try {
            const rate = await getFxRate(curr, workspaceCurrency);
            rates.set(curr, rate);
        } catch (e) {
            console.error(`Failed to fetch rate for ${curr}`, e);
            rates.set(curr, 1); // Fallback
        }
    }));

    // Helper: Convert
    const convert = (amount: number, fromCurrency: string) => {
        const rate = rates.get(fromCurrency) || 1;
        return amount * rate;
    };


    const hasAccounts = (accountCount ?? 0) > 0;
    const hasCategories = (categoryCount ?? 0) > 0;
    const hasTransactions = (transactionCount ?? 0) > 0;
    const hasBudgets = (budgetCount ?? 0) > 0;

    // 5. Calculate Reserved Total
    let reservedTotal = 0;
    ledgerEntries?.forEach((entry: any) => {
        const amount = Number(entry.amount);
        const currency = entry.budget?.currency || "USD";
        const converted = convert(amount, currency);

        if (entry.type === 'fund' || entry.type === 'adjust') {
            reservedTotal += converted;
        } else {
            reservedTotal -= converted;
        }
    });

    // 6. Calculate Due This Month (Future funding needed)
    // Note: Due amount is usually in Budget Currency. We convert to Workspace Currency.
    let dueThisMonth = 0;
    const { data: activePlanBudgets } = await supabase
        .from("budgets")
        .select("id, currency, plan_config:budget_plan_configs(*)")
        .eq("workspace_id", workspaceId)
        .eq("type", "PLAN_SPEND")
        .eq("status", "active");

    const monthStart = startOfMonth(new Date()).toISOString();

    if (activePlanBudgets) {
        for (const budget of activePlanBudgets) {
            const rawConfig = (budget as any).plan_config;
            const config = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig;
            if (!config) continue;

            const { data: existing } = await supabase
                .from("budget_ledger")
                .select("id")
                .eq("budget_id", budget.id)
                .eq("type", "fund")
                .gte("date", monthStart)
                .limit(1);

            if (!existing || existing.length === 0) {
                const contribution = await calculateMonthlyContribution(config);
                // contribution is in Budget Currency. Convert.
                dueThisMonth += convert(contribution, budget.currency || "USD");
            }
        }
    }

    // 7. Pending Payments Count
    const { count: pendingPaymentsCount } = await supabase
        .from("budget_payments_due")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("workspace_id", workspaceId);

    // 8. Calculate Balances (Account Based)
    // We calculate balances in NATIVE currency first (per account), then convert FINAL balance to Workspace.
    // Why? Because transactions are in account currency.
    let totalBalance = 0;
    const accountBalances = new Map<string, number>(); // AccountID -> Native Balance

    if (accounts) {
        accounts.forEach(acc => {
            accountBalances.set(acc.id, Number(acc.opening_balance));
        });
    }

    const { data: allTx } = await supabase
        .from("transactions")
        .select("account_id, type, base_amount, date, category:categories(name)")
        .eq("workspace_id", workspaceId);

    // Map Account ID to Currency for easy lookup during TX loop
    const accountCurrencyMap = new Map<string, string>();
    accounts?.forEach(a => accountCurrencyMap.set(a.id, a.base_currency || "USD"));

    if (allTx) {
        allTx.forEach(tx => {
            const current = accountBalances.get(tx.account_id) || 0;
            accountBalances.set(tx.account_id, current + Number(tx.base_amount));
        });
    }

    // Sum converted balances
    if (accounts) {
        accounts.forEach(acc => {
            const nativeBalance = accountBalances.get(acc.id) || 0;
            const converted = convert(nativeBalance, acc.base_currency || "USD");
            totalBalance += converted;
        });
    }

    // 9. Monthly Stats (Income/Expenses)
    // Must convert each TX individually
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    const categoryMap = new Map<string, number>(); // Name -> Converted Amount

    if (allTx) {
        allTx.forEach(tx => {
            const txMonth = tx.date.slice(0, 7);
            if (txMonth === currentMonth) {
                const currency = accountCurrencyMap.get(tx.account_id) || "USD";

                if (tx.type === 'income') {
                    monthlyIncome += convert(Number(tx.base_amount), currency);
                } else if (tx.type === 'expense') {
                    const amount = Math.abs(Number(tx.base_amount));
                    const converted = convert(amount, currency); // Convert!

                    monthlyExpenses += converted;
                    const catName = (tx.category as any)?.name || "Uncategorized";
                    categoryMap.set(catName, (categoryMap.get(catName) || 0) + converted);
                }
            }
        });
    }

    const expensesByCategory = Array.from(categoryMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

    expensesByCategory.sort((a, b) => b.value - a.value);

    // Fetch Pending Payments
    const { data: pendingPayments } = await supabase
        .from("budget_payments_due")
        .select("*, budget:budgets(name, currency)")
        .eq("status", "pending")
        .eq("workspace_id", workspaceId)
        .order("due_date", { ascending: true });

    return {
        hasAccounts,
        hasCategories,
        hasBudgets,
        hasTransactions,
        expensesByCategory,
        totalBalance,
        availableCash: totalBalance - reservedTotal,
        monthlyIncome,
        monthlyExpenses,
        reservedTotal,
        dueThisMonth,
        pendingPaymentsCount: pendingPaymentsCount || 0,
        pendingPayments: pendingPayments || [],
    };
}

/**
 * Calculate balance history.
 */
export async function getBalanceHistory(
    workspaceId: string,
    range: "7d" | "30d" | "90d" | "1y" | "mtd" = "30d",
    accountId?: string
): Promise<{ date: string; balance: number }[]> {
    const supabase = await createClient();

    // 1. Determine Start Date
    const today = new Date();
    let startDate = new Date();

    if (range === "7d") startDate.setDate(today.getDate() - 7);
    if (range === "30d") startDate.setDate(today.getDate() - 30);
    if (range === "90d") startDate.setDate(today.getDate() - 90);
    if (range === "1y") startDate.setDate(today.getDate() - 365);
    if (range === "mtd") startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    const startDateStr = startDate.toISOString().slice(0, 10);

    // 2. Get Initial Balance (Opening + Transactions before Start Date)
    let accountsQuery = supabase
        .from("accounts")
        .select("id, opening_balance")
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false);

    if (accountId) {
        accountsQuery = accountsQuery.eq("id", accountId);
    }

    const { data: accounts } = await accountsQuery;

    let initialBalance = 0;
    if (accounts) {
        initialBalance = accounts.reduce((sum, acc) => sum + Number(acc.opening_balance), 0);
    }

    // Sum transactions before start date
    let preQuery = supabase
        .from("transactions")
        .select("base_amount")
        .eq("workspace_id", workspaceId)
        .lt("date", startDateStr);

    if (accountId) {
        preQuery = preQuery.eq("account_id", accountId);
    }

    const { data: preTransactions } = await preQuery;

    if (preTransactions) {
        const preSum = preTransactions.reduce((sum, tx) => sum + Number(tx.base_amount), 0);
        initialBalance += preSum;
    }

    // 3. Get transactions in range
    let rangeQuery = supabase
        .from("transactions")
        .select("date, base_amount")
        .eq("workspace_id", workspaceId)
        .gte("date", startDateStr)
        .order("date", { ascending: true });

    if (accountId) {
        rangeQuery = rangeQuery.eq("account_id", accountId);
    }

    const { data: rangeTransactions } = await rangeQuery;

    // 4. Build Daily Series
    const history: { date: string; balance: number }[] = [];
    let currentBalance = initialBalance;

    // Create map of date -> daily change
    const dailyChange = new Map<string, number>();
    if (rangeTransactions) {
        rangeTransactions.forEach(tx => {
            const val = dailyChange.get(tx.date) || 0;
            dailyChange.set(tx.date, val + Number(tx.base_amount));
        });
    }

    // Loop from Start Date to Today
    const d = new Date(startDate);
    // Strip time
    d.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(0, 0, 0, 0);

    while (d <= todayEnd) {
        const dateStr = d.toISOString().slice(0, 10);
        const change = dailyChange.get(dateStr) || 0;
        currentBalance += change;

        history.push({
            date: dateStr,
            balance: currentBalance
        });

        d.setDate(d.getDate() + 1);
    }

    return history;
}
