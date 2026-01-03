import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function InviteSettingsPage({ params }: PageProps) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Invite Contributor</h1>
                <p className="text-muted-foreground">
                    Invite team members to this workspace
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
                <p className="text-sm text-muted-foreground italic">
                    Team invitations coming soon.
                </p>
                <p className="text-sm text-muted-foreground">
                    You'll be able to invite contributors with different roles:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong>Manager</strong> - Can manage accounts and categories</li>
                    <li><strong>Contributor</strong> - Can add transactions</li>
                    <li><strong>Viewer</strong> - Read-only access</li>
                </ul>
            </div>
        </div>
    );
}
