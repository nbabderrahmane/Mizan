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
