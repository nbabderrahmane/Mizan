
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RoleSelectionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    // Double check permissions to determine where "Go to Workspaces" should actually verify
    // But mostly this page is just a router. 

    // We can fetch the first workspace ID to make the link smarter
    const { data: firstWorkspace } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    const workspaceLink = firstWorkspace
        ? `/w/${firstWorkspace.workspace_id}/dashboard`
        : "/onboarding/create-workspace";

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.user_metadata.full_name || "User"}</h1>
                    <p className="text-muted-foreground">Select an account to continue.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Admin Option */}
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group relative overflow-hidden">
                        {/* Clickable area via absolute link */}
                        <Link href="/admin" className="absolute inset-0 z-10">
                            <span className="sr-only">Go to Admin Dashboard</span>
                        </Link>
                        <CardHeader>
                            <div className="mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <CardTitle>Support Admin</CardTitle>
                            <CardDescription>
                                Access global system statistics, manage users, and view workspace metadata.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="secondary" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                                Enter Admin Dashboard
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Workspace Option */}
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group relative overflow-hidden">
                        <Link href={workspaceLink} className="absolute inset-0 z-10">
                            <span className="sr-only">Go to Personal Workspaces</span>
                        </Link>
                        <CardHeader>
                            <div className="mb-4 h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <CardTitle>Personal Workspaces</CardTitle>
                            <CardDescription>
                                Manage your shared budgets, transactions, and financial reports.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="secondary" className="w-full group-hover:bg-blue-500 group-hover:text-white">
                                Enter Workspaces
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
