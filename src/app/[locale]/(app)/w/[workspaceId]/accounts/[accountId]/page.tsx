import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/lib/actions/account";
import { getTransactions } from "@/lib/actions/transaction";
import { listWorkspaceMembers } from "@/lib/actions/workspace";
import { listCategories } from "@/lib/actions/category";
import { AccountDetailClient } from "./account-detail-client";

interface PageProps {
    params: Promise<{ workspaceId: string; accountId: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function AccountDetailPage({ params, searchParams }: PageProps) {
    const { workspaceId, accountId } = await params;
    const filters = await searchParams;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    // Fetch account data
    const accountsResult = await listAccounts(workspaceId);
    if (!accountsResult.success || !accountsResult.data) {
        redirect(`/w/${workspaceId}/accounts`);
    }

    const account = accountsResult.data.find((a: { id: string }) => a.id === accountId);
    if (!account) {
        redirect(`/w/${workspaceId}/accounts`);
    }

    // Fetch transactions for this account
    const transactionsResult = await getTransactions(workspaceId, {
        accountId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        createdBy: filters.createdBy,
    });

    // Fetch members for "Created By" filter and display
    const membersResult = await listWorkspaceMembers(workspaceId);

    // Fetch categories for potential editing
    const categoriesResult = await listCategories(workspaceId);

    return (
        <AccountDetailClient
            workspaceId={workspaceId}
            account={account}
            transactions={transactionsResult.success ? transactionsResult.data || [] : []}
            members={membersResult.success ? membersResult.data || [] : []}
            categories={categoriesResult.success ? categoriesResult.data || [] : []}
            accounts={accountsResult.data}
        />
    );
}
