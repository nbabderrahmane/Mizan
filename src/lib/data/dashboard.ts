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

    // 7. Calculate Balances (Account Based)
    let totalBalance = 0;
    const accountBalances = new Map<string, number>();

    if (accounts) {
        accounts.forEach(acc => {
            accountBalances.set(acc.id, Number(acc.opening_balance));
        });
    }

    const { data: allTx } = await supabase
        .from("transactions")
        .select("account_id, type, base_amount, date, category:categories(name)")
        .eq("workspace_id", workspaceId);

    const accountCurrencyMap = new Map<string, string>();
    accounts?.forEach(a => accountCurrencyMap.set(a.id, a.base_currency || "USD"));

    if (allTx) {
        allTx.forEach(tx => {
            const current = accountBalances.get(tx.account_id) || 0;
            accountBalances.set(tx.account_id, current + Number(tx.base_amount));
        });
    }

    if (accounts) {
        accounts.forEach(acc => {
            const nativeBalance = accountBalances.get(acc.id) || 0;
            const converted = convert(nativeBalance, acc.base_currency || "USD");
            totalBalance += converted;
        });
    }

    // 8. Monthly Stats (Income/Expenses)
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    const categoryMap = new Map<string, number>();

    if (allTx) {
        allTx.forEach(tx => {
            const txMonth = tx.date.slice(0, 7);
            if (txMonth === currentMonth) {
                const currency = accountCurrencyMap.get(tx.account_id) || "USD";

                if (tx.type === 'income') {
                    monthlyIncome += convert(Number(tx.base_amount), currency);
                } else if (tx.type === 'expense') {
                    const amount = Math.abs(Number(tx.base_amount));
                    const converted = convert(amount, currency);
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

    // 9. Pending Payments: Calculate Plan & Spend budgets that are due
    const today = new Date().toISOString().slice(0, 10);

    const { data: dueBudgets } = await supabase
        .from("budgets")
        .select(`
            id, 
            name, 
            currency, 
            subcategory_id,
            subcategory:subcategories(name),
            plan_config:budget_plan_configs(target_amount, due_date)
        `)
        .eq("workspace_id", workspaceId)
        .eq("type", "PLAN_SPEND")
        .eq("status", "active");

    // Get reserved amounts for these budgets
    const { data: ledgerSums } = await supabase
        .from("budget_ledger")
        .select("budget_id, type, amount")
        .eq("workspace_id", workspaceId);

    const budgetReservedMap = new Map<string, number>();
    ledgerSums?.forEach(entry => {
        const current = budgetReservedMap.get(entry.budget_id) || 0;
        if (entry.type === 'fund' || entry.type === 'adjust') {
            budgetReservedMap.set(entry.budget_id, current + Number(entry.amount));
        } else {
            budgetReservedMap.set(entry.budget_id, current - Number(entry.amount));
        }
    });

    // Get expense transactions to check which budgets have been paid
    const { data: expenseTransactions } = await supabase
        .from("transactions")
        .select("subcategory_id, date, base_amount")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense");

    // Map subcategory_id to transactions (to detect paid budgets)
    const paidSubcategories = new Set<string>();
    dueBudgets?.forEach(budget => {
        const rawConfig = (budget as any).plan_config;
        const config = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig;
        if (!config || !config.due_date) return;

        // Check if there's an expense transaction for this subcategory on/after due date
        const hasPaidTransaction = expenseTransactions?.some(tx =>
            tx.subcategory_id === budget.subcategory_id &&
            tx.date >= config.due_date
        );

        if (hasPaidTransaction) {
            paidSubcategories.add(budget.subcategory_id);
        }
    });

    // Filter budgets that are due (due_date <= today), have reserved funds, and NOT already paid
    const pendingPayments: any[] = [];
    dueBudgets?.forEach(budget => {
        const rawConfig = (budget as any).plan_config;
        const config = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig;
        if (!config || !config.due_date) return;

        // Check if due date has passed or is today AND not already paid
        if (config.due_date <= today && !paidSubcategories.has(budget.subcategory_id)) {
            const reserved = budgetReservedMap.get(budget.id) || 0;
            if (reserved > 0) {
                pendingPayments.push({
                    id: budget.id,
                    budget_id: budget.id,
                    due_date: config.due_date,
                    amount_expected: config.target_amount,
                    amount_reserved: reserved,
                    status: "pending",
                    budget: {
                        id: budget.id,
                        name: budget.name || (budget.subcategory as any)?.name || "Unnamed",
                        currency: budget.currency,
                        subcategory_id: budget.subcategory_id
                    }
                });
            }
        }
    });

    // Sort by due date ascending
    pendingPayments.sort((a, b) => a.due_date.localeCompare(b.due_date));

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
        pendingPaymentsCount: pendingPayments.length,
        pendingPayments,
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
