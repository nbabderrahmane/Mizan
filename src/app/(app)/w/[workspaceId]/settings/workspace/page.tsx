import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace, getUserWorkspaceRole } from "@/lib/actions/workspace";
import { SettingsPageClient } from "./settings-client";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    // Get workspace
    const workspaceResult = await getWorkspace(workspaceId);
    if (!workspaceResult.success || !workspaceResult.data) {
        redirect("/");
    }

    // Get user role
    const roleResult = await getUserWorkspaceRole(workspaceId);
    const isOwner = roleResult.data === "OWNER";

    return (
        <SettingsPageClient
            workspaceId={workspaceId}
            workspaceName={workspaceResult.data.name}
            currency={workspaceResult.data.currency}
            isOwner={isOwner}
        />
    );
}
