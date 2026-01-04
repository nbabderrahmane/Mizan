import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/lib/actions/category";
import { CategoriesPageClient } from "./categories-client";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function CategoriesPage({ params }: PageProps) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    // Check if user can manage
    const { data: canManage } = await supabase.rpc("can_manage_workspace", {
        ws_id: workspaceId,
    });

    // Get categories
    const result = await listCategories(workspaceId);
    const categories = result.success ? result.data || [] : [];

    return (
        <CategoriesPageClient
            workspaceId={workspaceId}
            categories={categories}
            canManage={!!canManage}
        />
    );
}
