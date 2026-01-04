"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/profile";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ProfileFormProps {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    currentLocale?: string | null;
}

export function ProfileForm({ firstName, lastName, email, currentLocale }: ProfileFormProps) {
    const t = useTranslations("Auth");
    const common = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await updateProfile(formData);

        setIsLoading(false);

        if (result.success) {
            toast.success(common("success"));
            const newLocale = formData.get("locale") as string;
            if (newLocale !== locale) {
                router.replace(pathname, { locale: newLocale as any });
            } else {
                router.refresh();
            }
        } else {
            toast.error(result.error?.message || common("error"));
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            <div className="space-y-4 rounded-lg border bg-card p-6">
                <div>
                    <Label>{t("email")}</Label>
                    <Input value={email} disabled className="bg-muted" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {t("emailCannotBeChanged") || "Email cannot be changed."}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="first_name">{t("firstName")}</Label>
                        <Input
                            id="first_name"
                            name="first_name"
                            defaultValue={firstName || ""}
                            placeholder={t("firstNamePlaceholder")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last_name">{t("lastName")}</Label>
                        <Input
                            id="last_name"
                            name="last_name"
                            defaultValue={lastName || ""}
                            placeholder={t("lastNamePlaceholder")}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="locale">{t("selectLanguage")}</Label>
                    <Select name="locale" defaultValue={currentLocale || locale}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("selectLanguage")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">🇺🇸 English</SelectItem>
                            <SelectItem value="fr">🇫🇷 Français</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {common("save")}
                </Button>
            </div>
        </form>
    );
}
