import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/lib/actions/account";
import { listWorkspaceMembers } from "@/lib/actions/workspace";
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

    // Get workspace details (for type)
    const { data: workspace } = await supabase
        .from("workspaces")
        .select("type")
        .eq("id", workspaceId)
        .single();

    const workspaceType = workspace?.type || "personal";

    // Get accounts
    const result = await listAccounts(workspaceId);
    const accounts = result.success ? result.data || [] : [];

    // Get members
    const membersResult = await listWorkspaceMembers(workspaceId);
    const members = membersResult.success ? membersResult.data || [] : [];

    return (
        <AccountsPageClient
            workspaceId={workspaceId}
            accounts={accounts}
            members={members}
            canManage={!!canManage}
            workspaceType={workspaceType}
        />
    );
}
