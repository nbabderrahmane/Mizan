import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function ProfileSettingsPage({ params }: PageProps) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth/sign-in");
    }

    // Get profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Edit Profile</h1>
                <p className="text-muted-foreground">
                    Manage your personal information
                </p>
            </div>

            <ProfileForm
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                email={user.email}
                currentLocale={profile?.locale}
            />
        </div>
    );
}
