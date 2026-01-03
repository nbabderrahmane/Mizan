import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listWorkspacesForUser } from "@/lib/actions/workspace";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ workspaceId: string }>;
}) {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    // Get user's workspaces
    const workspacesResult = await listWorkspacesForUser();
    const workspaces = workspacesResult.success ? workspacesResult.data || [] : [];

    // Get current workspace ID from params
    const resolvedParams = await params;
    const currentWorkspaceId = resolvedParams.workspaceId;

    // Verify user has access to this workspace
    const hasAccess = workspaces.some((w) => w.id === currentWorkspaceId);

    if (!hasAccess) {
        // If no workspaces, redirect to create one
        if (workspaces.length === 0) {
            redirect("/onboarding/create-workspace");
        }
        // Otherwise redirect to first workspace
        redirect(`/w/${workspaces[0].id}/dashboard`);
    }

    return (
        <AppShell
            workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
            currentWorkspaceId={currentWorkspaceId}
            userEmail={user.email}
        >
            {children}
        </AppShell>
    );
}
