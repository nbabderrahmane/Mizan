import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format, parseISO, eachMonthOfInterval, eachDayOfInterval } from "date-fns";
import { getFxRate } from "@/lib/services/fx";
import { createLogger } from "@/lib/logger";

export type MonthlyTrend = {
    label: string;
    income: number;
    expenses: number;
    net: number;
    balance: number;
    safeCash: number;
};

export type SubCategoryStat = {
    name: string;
    value: number;
};

export type CategoryStat = {
    name: string;
    value: number;
    color: string;
    subcategories: SubCategoryStat[];
};

export type ReportData = {
    summary: {
        totalIncome: number;
        totalExpenses: number;
        grossFlow: number;
        totalFunding: number;
        netFlow: number;
    };
    incomeBreakdown: CategoryStat[];
    expenseBreakdown: CategoryStat[];
    monthlyTrends: MonthlyTrend[];
    currency: string;
    isDaily: boolean;
};

export type ReportPeriod = "this_month" | "last_month" | "3m" | "6m" | "12m" | "all";

export async function getPandLReport(
    workspaceId: string,
    options: {
        startDate?: string;
        endDate?: string;
        period?: ReportPeriod;
    } = { period: "6m" }
): Promise<ReportData> {
    const supabase = await createClient();
    const logger = createLogger();

    // 1. Get Workspace Currency
    const { data: workspace } = await supabase
        .from("workspaces")
        .select("currency")
        .eq("id", workspaceId)
        .single();
    const workspaceCurrency = workspace?.currency || "USD";

    // 2. Define Date Range
    const today = new Date();
    let endDate = options.endDate ? parseISO(options.endDate) : endOfMonth(today);
    let startDate: Date;

    const period = options.period || "6m";
    const isDaily = period === "this_month";

    switch (period) {
        case "this_month":
            startDate = startOfMonth(today);
            endDate = endOfMonth(today);
            break;
        case "last_month":
            startDate = startOfMonth(subMonths(today, 1));
            endDate = endOfMonth(subMonths(today, 1));
            break;
        case "3m":
            startDate = startOfMonth(subMonths(today, 2));
            break;
        case "6m":
            startDate = startOfMonth(subMonths(today, 5));
            break;
        case "12m":
            startDate = startOfMonth(subMonths(today, 11));
            break;
        case "all":
            startDate = new Date(2024, 0, 1);
            break;
        default:
            startDate = startOfMonth(subMonths(today, 5));
    }

    if (options.startDate) startDate = parseISO(options.startDate);
    if (options.endDate) endDate = parseISO(options.endDate);

    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    // 3. Fetch Accounts for Initial Balance
    const { data: accounts } = await supabase
        .from("accounts")
        .select("id, opening_balance, base_currency")
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false);

    // 4. Fetch ALL transactions and ledger entries for cumulative calculation
    // Note: To be efficient, we only need transactions/ledger up to endDate.
    const { data: transactions } = await supabase
        .from("transactions")
        .select("*, account:account_id(base_currency), category:category_id(name), subcategory:subcategory_id(name)")
        .eq("workspace_id", workspaceId)
        .lte("date", endDateStr)
        .order("date", { ascending: true });

    const { data: ledgerEntries } = await supabase
        .from("budget_ledger")
        .select("*, budget:budgets(currency)")
        .eq("workspace_id", workspaceId)
        .lte("date", endDateStr)
        .order("date", { ascending: true });

    // 5. Fetch FX Rates
    const currencies = new Set<string>();
    currencies.add(workspaceCurrency);
    accounts?.forEach(a => currencies.add(a.base_currency || "USD"));
    ledgerEntries?.forEach((e: any) => currencies.add(e.budget?.currency || "USD"));

    const rates = new Map<string, number>();
    await Promise.all(Array.from(currencies).map(async (curr) => {
        try {
            const rate = await getFxRate(curr, workspaceCurrency);
            rates.set(curr, rate);
        } catch (e) {
            rates.set(curr, 1);
        }
    }));

    const convert = (amount: number, fromCurr: string) => {
        const rate = rates.get(fromCurr) || 1;
        return amount * rate;
    };

    // 6. Aggregate Data
    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeCategoryMap = new Map<string, { value: number; subcategories: Map<string, number> }>();
    const expenseCategoryMap = new Map<string, { value: number; subcategories: Map<string, number> }>();
    const trendMap = new Map<string, { income: number; expenses: number; net: number; balance: number; safeCash: number }>();

    // Initial State Calculation (Before StartDate)
    // ... (currentBalance calculation)
    let currentBalance = 0;
    accounts?.forEach(acc => {
        currentBalance += convert(Number(acc.opening_balance), acc.base_currency || "USD");
    });

    let currentReserved = 0;

    // Filter transactions into period vs pre-period
    const periodTransactions = transactions?.filter(tx => tx.date >= startDateStr) || [];
    const prePeriodTransactions = transactions?.filter(tx => tx.date < startDateStr) || [];

    prePeriodTransactions.forEach(tx => {
        const fromCurr = (tx.account as any)?.base_currency || "USD";
        currentBalance += convert(Number(tx.base_amount), fromCurr);
    });

    // ... (prePeriodLedger calculation)
    // Filter ledger into period vs pre-period
    const prePeriodLedger = ledgerEntries?.filter(e => e.date < startDateStr) || [];
    prePeriodLedger.forEach((entry: any) => {
        const amount = convert(Number(entry.amount), entry.budget?.currency || "USD");
        if (entry.type === 'fund' || entry.type === 'adjust') {
            currentReserved += amount;
        } else {
            currentReserved -= amount;
        }
    });

    // ... (trendMap initialization)
    // Initialize trendMap with all days/months in interval
    const intervalOptions = { start: startDate, end: endDate };
    const steps = isDaily
        ? eachDayOfInterval(intervalOptions)
        : eachMonthOfInterval(intervalOptions);

    steps.forEach((s: Date) => {
        const label = isDaily ? format(s, "yyyy-MM-dd") : format(s, "yyyy-MM");
        trendMap.set(label, { income: 0, expenses: 0, net: 0, balance: 0, safeCash: 0 });
    });

    // Process Period Transactions
    periodTransactions.forEach(tx => {
        const fromCurr = (tx.account as any)?.base_currency || "USD";
        const txLabel = isDaily ? tx.date : tx.date.slice(0, 7);
        const amountInBase = Number(tx.base_amount);
        const amountAbs = Math.abs(amountInBase);
        const converted = convert(amountAbs, fromCurr);
        const convertedSigned = convert(amountInBase, fromCurr);

        currentBalance += convertedSigned;

        if (trendMap.has(txLabel)) {
            const stats = trendMap.get(txLabel)!;
            const catName = (tx.category as any)?.name || "Uncategorized";
            const subName = (tx.subcategory as any)?.name || "Other";

            if (tx.type === "income") {
                stats.income += converted;
                totalIncome += converted;

                if (!incomeCategoryMap.has(catName)) {
                    incomeCategoryMap.set(catName, { value: 0, subcategories: new Map() });
                }
                const cat = incomeCategoryMap.get(catName)!;
                cat.value += converted;
                cat.subcategories.set(subName, (cat.subcategories.get(subName) || 0) + converted);

            } else if (tx.type === "expense") {
                stats.expenses += converted;
                totalExpenses += converted;

                if (!expenseCategoryMap.has(catName)) {
                    expenseCategoryMap.set(catName, { value: 0, subcategories: new Map() });
                }
                const cat = expenseCategoryMap.get(catName)!;
                cat.value += converted;
                cat.subcategories.set(subName, (cat.subcategories.get(subName) || 0) + converted);
            }
            stats.net += convertedSigned;
        }
    });

    // Process Period Ledger entries for Safe Cash
    let totalFunding = 0;
    const periodLedger = ledgerEntries?.filter(e => e.date >= startDateStr) || [];
    const ledgerLabelMap = new Map<string, number>();
    periodLedger.forEach((entry: any) => {
        const txLabel = isDaily ? entry.date : entry.date.slice(0, 7);
        const amount = convert(Number(entry.amount), entry.budget?.currency || "USD");

        if (entry.type === 'fund') {
            totalFunding += amount;
        }

        const sign = (entry.type === 'fund' || entry.type === 'adjust') ? 1 : -1;
        ledgerLabelMap.set(txLabel, (ledgerLabelMap.get(txLabel) || 0) + (amount * sign));
    });

    // Final pass through trendMap to compute cumulative snapshots
    let tempBalance = currentBalance - periodTransactions.reduce((acc, tx) => acc + convert(Number(tx.base_amount), (tx.account as any)?.base_currency || "USD"), 0);
    let tempReserved = currentReserved;

    const sortedLabels = Array.from(trendMap.keys()).sort();
    sortedLabels.forEach(label => {
        const stats = trendMap.get(label)!;
        tempBalance += stats.net;
        tempReserved += (ledgerLabelMap.get(label) || 0);

        stats.balance = tempBalance;
        stats.safeCash = tempBalance - tempReserved;
    });

    // 7. Format Result
    const formatBreakdown = (map: Map<string, { value: number; subcategories: Map<string, number> }>, paletteOffset: number = 0) => {
        return Array.from(map.entries())
            .map(([name, data], index) => ({
                name,
                value: data.value,
                color: `hsl(var(--chart-${((index + paletteOffset) % 5) + 1}))`,
                subcategories: Array.from(data.subcategories.entries())
                    .map(([subName, subValue]) => ({ name: subName, value: subValue }))
                    .sort((a, b) => b.value - a.value)
            }))
            .sort((a, b) => b.value - a.value);
    };

    const incomeBreakdown = formatBreakdown(incomeCategoryMap, 0);
    const expenseBreakdown = formatBreakdown(expenseCategoryMap, 2);

    const monthlyTrends: MonthlyTrend[] = sortedLabels.map(label => {
        const stats = trendMap.get(label)!;
        return {
            label,
            income: Number(stats.income.toFixed(2)),
            expenses: Number(stats.expenses.toFixed(2)),
            net: Number(stats.net.toFixed(2)),
            balance: Number(stats.balance.toFixed(2)),
            safeCash: Number(stats.safeCash.toFixed(2)),
        };
    });

    const grossFlow = totalIncome - totalExpenses;
    const netFlow = grossFlow - totalFunding;

    return {
        summary: {
            totalIncome: Number(totalIncome.toFixed(2)),
            totalExpenses: Number(totalExpenses.toFixed(2)),
            grossFlow: Number(grossFlow.toFixed(2)),
            totalFunding: Number(totalFunding.toFixed(2)),
            netFlow: Number(netFlow.toFixed(2)),
        },
        incomeBreakdown,
        expenseBreakdown,
        monthlyTrends,
        currency: workspaceCurrency,
        isDaily
    };
}
