import { listBudgets } from "@/lib/actions/budget";
import { listCategories } from "@/lib/actions/category";
import { listAccounts } from "@/lib/actions/account";
import { BudgetsClient } from "./budgets-client";

export default async function BudgetsPage({
    params,
}: {
    params: Promise<{ workspaceId: string }>;
}) {
    const { workspaceId } = await params;

    const [budgetsRes, categoriesRes, accountsRes] = await Promise.all([
        listBudgets(workspaceId),
        listCategories(workspaceId),
        listAccounts(workspaceId)
    ]);

    const budgets = budgetsRes.success ? budgetsRes.data || [] : [];
    const categories = categoriesRes.success ? categoriesRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    return (
        <BudgetsClient
            workspaceId={workspaceId}
            initialBudgets={budgets}
            categories={categories}
            accounts={accounts}
        />
    );
}
