"use client";

import { useState } from "react";
import Link from "next/link";
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
import { forgotPassword } from "@/lib/actions/auth";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
    const t = useTranslations("Auth");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const result = await forgotPassword(formData);

        if (result.success) {
            setIsSubmitted(true);
        } else {
            setError(result.error?.message || common("error"));
        }

        setIsLoading(false);
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">{t("checkEmail")}</CardTitle>
                        <CardDescription>
                            {t("checkEmailDesc")}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Link href="/auth/sign-in" className="text-sm text-primary hover:underline flex items-center">
                            <ArrowLeft className="w-4 h-4 me-2" />
                            {common("backToSignIn")}
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                    <CardDescription>
                        {t("resetPasswordDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">{common("email")}</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? t("sendingLink") : t("sendResetLink")}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/auth/sign-in" className="text-sm text-muted-foreground hover:text-primary flex items-center">
                        <ArrowLeft className="w-4 h-4 me-2" />
                        {common("backToSignIn")}
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
