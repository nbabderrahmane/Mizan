import { listWorkspaceMembers, getMemberRole } from "@/lib/actions/workspace";
import { listPendingInvites } from "@/lib/actions/invite";
import { MembersClient } from "./members-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function MembersPage({ params }: PageProps) {
    const { workspaceId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    // Parallel data fetching
    const [membersResult, invitesResult, roleResult] = await Promise.all([
        listWorkspaceMembers(workspaceId),
        listPendingInvites(workspaceId),
        getMemberRole(workspaceId, user.id)
    ]);

    const members = membersResult.success ? membersResult.data || [] : [];
    const invites = invitesResult.success ? invitesResult.data || [] : [];
    const isOwner = roleResult.success && roleResult.data === "OWNER";

    return (
        <div className="container mx-auto py-6">
            <MembersClient
                workspaceId={workspaceId}
                currentUserId={user.id}
                isOwner={isOwner}
                initialMembers={members}
                initialInvites={invites}
            />
        </div>
    );
}
