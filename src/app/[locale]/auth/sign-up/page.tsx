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
import { signUp } from "@/lib/actions/auth";

function SignUpForm() {
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

        const result = await signUp(formData);

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
                <CardTitle className="text-2xl">{t("createAccount")}</CardTitle>
                <CardDescription>
                    {t("signUpDescription")}
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">{t("firstName")}</Label>
                            <Input
                                id="firstName"
                                name="firstName"
                                type="text"
                                placeholder={t("firstNamePlaceholder")}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">{t("lastName")}</Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                type="text"
                                placeholder={t("lastNamePlaceholder")}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>
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
                        <Label htmlFor="password">{t("password")}</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            minLength={8}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t("passwordMinLengthHint")}
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? t("creatingAccount") : t("signUp")}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                    {t("alreadyHaveAccount")}{" "}
                    <Link href={`/auth/sign-in${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} className="text-primary hover:underline">
                        {t("signIn")}
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function SignUpPage() {
    const t = useTranslations("Auth");
    const common = useTranslations("Common");

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>

            <Suspense fallback={
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{t("createAccount")}</CardTitle>
                        <CardDescription>{common("loading")}</CardDescription>
                    </CardHeader>
                </Card>
            }>
                <SignUpForm />
            </Suspense>
        </div>
    );
}
