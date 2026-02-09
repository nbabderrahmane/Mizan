import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupPageClient } from "./setup-client";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function SetupPage({ params }: PageProps) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    // Check existing data
    const [categoriesResult, accountsResult, workspaceResult] = await Promise.all([
        supabase
            .from("categories")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId),
        supabase
            .from("accounts")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .eq("is_archived", false),
        supabase
            .from("workspaces")
            .select("type")
            .eq("id", workspaceId)
            .single(),
    ]);

    const hasCategories = (categoriesResult.count ?? 0) > 0;
    const hasAccounts = (accountsResult.count ?? 0) > 0;
    const workspaceType = (workspaceResult as any).data?.type || "personal";

    return (
        <SetupPageClient
            workspaceId={workspaceId}
            hasCategories={hasCategories}
            hasAccounts={hasAccounts}
            workspaceType={workspaceType}
        />
    );
}
