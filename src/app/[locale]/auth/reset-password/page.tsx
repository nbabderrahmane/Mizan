"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { updatePassword } from "@/lib/actions/auth";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
    const t = useTranslations("Auth");
    const common = useTranslations("Common");
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // The session should be established by the time the user lands here
    // from the reset link (Supabase handles this via the redirectTo URL).

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await updatePassword(password);

        if (result.success) {
            setIsSuccess(true);
            // Redirect to sign in after 3 seconds
            setTimeout(() => {
                router.push("/auth/sign-in");
            }, 3000);
        } else {
            setError(result.error?.message || t("updateFailed"));
        }

        setIsLoading(false);
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">{t("passwordUpdated")}</CardTitle>
                        <CardDescription>
                            {t("passwordUpdatedDesc")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{t("redirectingSignIn")}</p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button variant="outline" onClick={() => router.push("/auth/sign-in")}>
                            {t("signIn")}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">{t("enterNewPassword")}</CardTitle>
                    <CardDescription>
                        {t("resetPasswordDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("newPassword")}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{common("confirmPassword")}</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? t("updating") : t("updatePassword")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
