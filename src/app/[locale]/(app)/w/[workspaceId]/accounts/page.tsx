import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/lib/actions/account";
import { AccountsPageClient } from "./accounts-client";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function AccountsPage({ params }: PageProps) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    // Check if user can manage (OWNER/MANAGER)
    const { data: canManage } = await supabase.rpc("can_manage_workspace", {
        ws_id: workspaceId,
    });

    // Get accounts
    const result = await listAccounts(workspaceId);
    const accounts = result.success ? result.data || [] : [];

    return (
        <AccountsPageClient
            workspaceId={workspaceId}
            accounts={accounts}
            canManage={!!canManage}
        />
    );
}
