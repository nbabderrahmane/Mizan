import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function PasswordSettingsPage({ params }: PageProps) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Change Password</h1>
                <p className="text-muted-foreground">
                    Update your account password
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
                <p className="text-sm text-muted-foreground italic">
                    Password change coming soon.
                </p>
                <p className="text-sm text-muted-foreground">
                    You'll receive an email to reset your password.
                </p>
            </div>
        </div>
    );
}
