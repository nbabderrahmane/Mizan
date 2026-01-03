import { getTransactions, getUniqueVendors } from "@/lib/actions/transaction";
import { listAccounts } from "@/lib/actions/account";
import { listCategories } from "@/lib/actions/category";
import { listWorkspaceMembers } from "@/lib/actions/workspace";
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
    }>;
}) {
    const { workspaceId } = await params;
    const { month, accountId, startDate, endDate, vendor, createdBy } = await searchParams;

    // Default month to current if not specified AND no date range
    // If startDate/endDate is present, month is ignored (or set to undefined for default)
    const currentMonth = (!startDate && !endDate && !month)
        ? new Date().toISOString().slice(0, 7)
        : month;

    // Fetch Data in Parallel
    const [transactionsResult, accountsResult, categoriesResult, vendors, membersResult] = await Promise.all([
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
    ]);

    const transactions = transactionsResult.success ? transactionsResult.data || [] : [];
    const accounts = accountsResult.success ? accountsResult.data || [] : [];
    const categories = categoriesResult.success ? categoriesResult.data || [] : [];
    const members = membersResult.success ? membersResult.data || [] : [];

    return (
        <TransactionsPageClient
            workspaceId={workspaceId}
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            initialVendors={vendors}
            members={members}
        />
    );
}
