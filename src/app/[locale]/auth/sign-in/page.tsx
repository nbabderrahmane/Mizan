"use client";

import { useState, Suspense } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { signIn } from "@/lib/actions/auth";

function SignInForm() {
    const t = useTranslations("Auth");
    const common = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get("returnTo");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const result = await signIn(formData);

        if (result.success) {
            window.location.href = returnTo || "/";
        } else {
            setError(result.error?.message || common("error"));
        }

        setIsLoading(false);
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t("welcomeBack") || "Welcome back"}</CardTitle>
                <CardDescription>
                    {t("signInDescription") || "Sign in to your Mizan account"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <input type="hidden" name="locale" value={locale} />
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t("emailPlaceholder")}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">{t("password")}</Label>
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                {t("forgotPassword") || "Forgot password?"}
                            </Link>
                        </div>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (t("signingIn") || "Signing in...") : t("signIn")}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                    {t("noAccount") || "Don't have an account?"}{" "}
                    <Link href="/auth/sign-up" className="text-primary hover:underline">
                        {t("signUp")}
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function SignInPage() {
    const common = useTranslations("Common");
    const t = useTranslations("Auth");

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>

            <Suspense fallback={
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{t("welcomeBack") || "Welcome back"}</CardTitle>
                        <CardDescription>{common("loading")}</CardDescription>
                    </CardHeader>
                </Card>
            }>
                <SignInForm />
            </Suspense>
        </div>
    );
}
