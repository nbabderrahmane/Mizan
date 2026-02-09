import { listBudgets } from "@/lib/actions/budget";
import { listCategories } from "@/lib/actions/category";
import { listAccounts } from "@/lib/actions/account";
import { getWorkspace } from "@/lib/actions/workspace";
import { BudgetsClient } from "./budgets-client";

export default async function BudgetsPage({
    params,
}: {
    params: Promise<{ workspaceId: string }>;
}) {
    const { workspaceId } = await params;

    const [budgetsRes, categoriesRes, accountsRes, workspaceRes] = await Promise.all([
        listBudgets(workspaceId),
        listCategories(workspaceId),
        listAccounts(workspaceId),
        getWorkspace(workspaceId)
    ]);

    const budgets = budgetsRes.success ? budgetsRes.data || [] : [];
    const categories = categoriesRes.success ? categoriesRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const workspaceCurrency = workspaceRes.success ? workspaceRes.data?.currency || "USD" : "USD";

    // Extract unique currencies from budgets and accounts
    const budgetCurrencies = new Set(budgets.map((b) => b.currency));
    accounts.forEach(a => budgetCurrencies.add(a.base_currency));

    // Fetch FX rates for all unique currencies relative to workspace currency
    const fxRates: Record<string, number> = {};
    if (workspaceCurrency) {
        // Self rate is always 1
        fxRates[workspaceCurrency] = 1;

        // Fetch others
        const { getFxRate } = await import("@/lib/services/fx");
        await Promise.all(
            Array.from(budgetCurrencies).map(async (currency) => {
                if (currency && currency !== workspaceCurrency) {
                    try {
                        const rate = await getFxRate(currency, workspaceCurrency);
                        fxRates[currency] = rate;
                    } catch (e) {
                        console.error(`Failed to fetch FX rate for ${currency} -> ${workspaceCurrency}`, e);
                        fxRates[currency] = 1; // Fallback to 1:1 if fails, better than crash but needs alert?
                    }
                }
            })
        );
    }

    return (
        <BudgetsClient
            workspaceId={workspaceId}
            initialBudgets={budgets}
            categories={categories}
            accounts={accounts}
            workspaceCurrency={workspaceCurrency}
        />
    );
}
