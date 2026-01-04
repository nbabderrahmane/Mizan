"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePassword } from "@/lib/actions/auth";
import { AlertCircle, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default function PasswordSettingsPage({ params }: PageProps) {
    const t = useTranslations("Password");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            setError(t("notMatch"));
            setIsLoading(false);
            return;
        }

        const result = await changePassword(formData);

        if (result.success) {
            toast.success(t("updateSuccess"));
            // Optional: reset form
            const form = document.querySelector("form") as HTMLFormElement;
            form?.reset();
        } else {
            setError(result.error?.message || t("updateFailed"));
            toast.error(t("updateFailed"));
        }

        setIsLoading(false);
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <p className="text-muted-foreground">
                    {t("description")}
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
                <form action={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                        <div className="relative">
                            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                placeholder="••••••••"
                                className="pl-9"
                                required
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t("verifyCurrentHint")}
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">{t("newPassword")}</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? common("saving") : common("saveChanges")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
