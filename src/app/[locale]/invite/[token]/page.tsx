import { getInviteByToken } from "@/lib/actions/invite";
import { InviteAcceptClient } from "./invite-accept-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
    const { token } = await params;
    const t = await getTranslations("Invitations");
    const result = await getInviteByToken(token);

    // Check if user is logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-background rounded-xl shadow-2xl border p-8 space-y-8 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

                {!result.success ? (
                    <div className="text-center space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-destructive">{t("invalid")}</h1>
                            <p className="text-muted-foreground">{result.error?.message || t("invalidDesc")}</p>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Go to Homepage
                            </Link>
                        </Button>
                    </div>
                ) : !user ? (
                    <div className="text-center space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">{t("signInToJoin")}</h1>
                            <p className="text-muted-foreground">
                                {t("signInToJoinDesc")}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Button asChild className="w-full">
                                <Link href={`/auth/sign-in?returnTo=/invite/${token}`}>{t("signIn")}</Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                                <Link href={`/auth/sign-up?returnTo=/invite/${token}`}>{t("createAccount")}</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <InviteAcceptClient
                        token={token}
                        workspaceName={result.data!.workspace_name}
                        role={result.data!.role}
                    />
                )}
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-primary transition-colors">
                    Mizan &copy; 2026
                </Link>
            </p>
        </div>
    );
}
