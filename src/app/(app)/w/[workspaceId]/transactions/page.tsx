import { getTransactions, getUniqueVendors } from "@/lib/actions/transaction";
import { listAccounts } from "@/lib/actions/account";
import { listCategories } from "@/lib/actions/category";
import { listWorkspaceMembers, getWorkspace } from "@/lib/actions/workspace";
import { listBudgets } from "@/lib/actions/budget";
import { TransactionsPageClient } from "./transactions-client";

export default async function TransactionsPage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceId: string }>;
    searchParams: Promise<{
        month?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
        vendor?: string;
        createdBy?: string;
        paymentId?: string;
    }>;
}) {
    const { workspaceId } = await params;
    const { month, accountId, startDate, endDate, vendor, createdBy, paymentId } = await searchParams;

    // Default month to current if not specified AND no date range
    // If startDate/endDate is present, month is ignored (or set to undefined for default)
    const currentMonth = (!startDate && !endDate && !month)
        ? new Date().toISOString().slice(0, 7)
        : month;

    // Fetch Data in Parallel
    const [transactionsResult, accountsResult, categoriesResult, vendors, membersResult, workspaceRes, budgetsRes] = await Promise.all([
        getTransactions(workspaceId, {
            month: currentMonth,
            startDate,
            endDate,
            accountId: accountId && accountId !== 'all' ? accountId : undefined,
            vendor,
            createdBy
        }),
        listAccounts(workspaceId),
        listCategories(workspaceId),
        getUniqueVendors(workspaceId),
        listWorkspaceMembers(workspaceId),
        getWorkspace(workspaceId),
        listBudgets(workspaceId)
    ]);

    const transactions = transactionsResult.success ? transactionsResult.data || [] : [];
    const accounts = accountsResult.success ? accountsResult.data || [] : [];
    const categories = categoriesResult.success ? categoriesResult.data || [] : [];
    const members = membersResult.success ? membersResult.data || [] : [];
    const workspaceCurrency = workspaceRes.success ? workspaceRes.data?.currency || "USD" : "USD";
    const budgets = budgetsRes.success ? budgetsRes.data || [] : [];

    // Calculate pending payments (Plan & Spend budgets that are due)
    const today = new Date().toISOString().slice(0, 10);

    // Create a set of subcategory_ids that have been paid (have expense transactions on/after due date)
    const paidSubcategoryIds = new Set<string>();
    budgets.forEach(budget => {
        if (budget.type !== "PLAN_SPEND") return;
        const planConfig = Array.isArray(budget.plan_config) ? budget.plan_config[0] : budget.plan_config;
        if (!planConfig?.due_date) return;

        // Check if any transaction matches this subcategory on/after due date
        const isPaid = transactions.some(tx =>
            tx.type === "expense" &&
            tx.subcategory_id === budget.subcategory_id &&
            tx.date >= planConfig.due_date
        );
        if (isPaid) {
            paidSubcategoryIds.add(budget.subcategory_id);
        }
    });

    const pendingPayments = budgets
        .filter(budget => {
            if (budget.type !== "PLAN_SPEND") return false;
            const planConfig = Array.isArray(budget.plan_config) ? budget.plan_config[0] : budget.plan_config;
            if (!planConfig?.due_date) return false;
            // Exclude if already paid
            if (paidSubcategoryIds.has(budget.subcategory_id)) return false;
            return planConfig.due_date <= today && (budget.current_reserved || 0) > 0;
        })
        .map(budget => {
            const planConfig = Array.isArray(budget.plan_config) ? budget.plan_config[0] : budget.plan_config;
            return {
                id: budget.id,
                name: budget.name || budget.subcategory?.name || "Unnamed",
                subcategory_id: budget.subcategory_id,
                due_date: planConfig?.due_date,
                amount: planConfig?.target_amount || budget.current_reserved || 0,
                currency: budget.currency
            };
        });

    // Find initial payment to pre-fill if paymentId is provided
    const initialPaymentId = paymentId || undefined;

    return (
        <TransactionsPageClient
            workspaceId={workspaceId}
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            initialVendors={vendors}
            members={members}
            workspaceCurrency={workspaceCurrency}
            budgets={budgets}
            pendingPayments={pendingPayments}
            initialPaymentId={initialPaymentId}
        />
    );
}
