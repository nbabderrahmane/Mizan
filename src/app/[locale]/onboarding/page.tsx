import { checkUserInvites } from "@/lib/actions/invite";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Users, ArrowRight, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { getTranslations } from "next-intl/server";
import { getDomainConfig } from "@/lib/domain-config";

export default async function OnboardingPage() {
    const t = await getTranslations("Onboarding");
    const common = await getTranslations("Common");
    const auth = await getTranslations("Auth");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const domainConfig = user?.email ? getDomainConfig(user.email) : undefined;
    const appName = domainConfig?.appTitle || "Mizan";

    if (!user) {
        redirect("/auth/sign-in");
    }

    // Check for existing workspaces (redundancy check)
    const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1);

    if (memberships && memberships.length > 0) {
        redirect(`/w/${memberships[0].workspace_id}/dashboard`);
    }

    // Check for pending invites
    const invitesResult = await checkUserInvites();
    const hasInvites = invitesResult.success && (invitesResult.data?.length ?? 0) > 0;
    const firstInvite = hasInvites ? invitesResult.data![0] : null;

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">{t("welcome", { name: appName })}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t("welcomeDescription")}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Join Workspace Option */}
                    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${!hasInvites ? 'opacity-60 grayscale-[0.5]' : 'border-primary/50 bg-primary/5'}`}>
                        <CardHeader>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${hasInvites ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Users className="w-6 h-6" />
                            </div>
                            <CardTitle>{t("joinWorkspace")}</CardTitle>
                            <CardDescription>
                                {hasInvites
                                    ? t("hasInvites", { name: firstInvite?.workspace_name || "" })
                                    : t("noInvites")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                asChild
                                className="w-full group"
                                variant={hasInvites ? "default" : "outline"}
                                disabled={!hasInvites}
                            >
                                <Link href={hasInvites ? `/invite/${firstInvite?.token}` : "#"}>
                                    {t("joinNow")}
                                    <ArrowRight className="w-4 h-4 ms-2 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                        </CardContent>
                        {hasInvites && (
                            <div className="absolute top-0 right-0">
                                <span className="flex h-3 w-3 m-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                </span>
                            </div>
                        )}
                    </Card>

                    {/* Create Workspace Option */}
                    <Card className="transition-all duration-300 hover:shadow-xl hover:border-primary/50">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                                <PlusCircle className="w-6 h-6" />
                            </div>
                            <CardTitle>{t("createNew")}</CardTitle>
                            <CardDescription>
                                {t("createNewDesc")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="outline" className="w-full group">
                                <Link href="/onboarding/create-workspace">
                                    {t("createWorkspace")}
                                    <ArrowRight className="w-4 h-4 ms-2 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-center pt-4">
                    <form action={signOut}>
                        <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
                            <LogOut className="h-4 w-4 me-2" />
                            {auth("signOut")} ({user.email})
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
