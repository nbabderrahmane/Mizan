import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacesData } from "@/lib/data/workspace";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ workspaceId: string; locale: string }>;
}) {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    // Get user's workspaces and admin status in parallel
    const [workspacesResult, adminResult] = await Promise.all([
        getWorkspacesData(supabase, user.id),
        supabase.from("app_admins").select("role").eq("user_id", user.id).single()
    ]);

    if (!workspacesResult.success) {
        // No console.error here as per instruction
    }

    const workspaces = workspacesResult.success ? workspacesResult.data || [] : [];
    const isSupportAdmin = !!adminResult.data;

    // Get current workspace ID from params
    const { workspaceId } = await params;
    const currentWorkspaceId = workspaceId;

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

    // Get accounts and categories for the global transaction button
    const [accountsResult, categoriesResult] = await Promise.all([
        supabase.from("accounts").select("id, name, base_currency").eq("workspace_id", currentWorkspaceId).eq("is_archived", false),
        supabase.from("categories").select(`
            id, 
            name, 
            type,
            subcategories (
                id,
                name
            )
        `).eq("workspace_id", currentWorkspaceId)
    ]);

    const accounts = accountsResult.data || [];
    const categories = categoriesResult.data || [];

    return (
        <AppShell
            workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
            currentWorkspaceId={currentWorkspaceId}
            userEmail={user.email || ""}
            isSupportAdmin={isSupportAdmin}
            // Pass data for global transaction button
            accounts={accounts}
            categories={categories as any}
        >
            {children}
        </AppShell>
    );
}
