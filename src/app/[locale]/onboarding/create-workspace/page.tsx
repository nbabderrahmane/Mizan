"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { User, Briefcase } from "lucide-react";
import { createWorkspace } from "@/lib/actions/workspace";
import { signOut } from "@/lib/actions/auth";
import { useTranslations } from "next-intl";

export default function CreateWorkspacePage() {
    const t = useTranslations("Onboarding");
    const common = useTranslations("Common");
    const auth = useTranslations("Auth");
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const result = await createWorkspace(formData);

        if (result.success && result.data) {
            // Redirect to setup wizard for new workspaces
            router.push(`/w/${result.data.id}/setup`);
        } else {
            setError(result.error?.message || common("error"));
        }

        setIsLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{t("createYourWorkspace")}</CardTitle>
                    <CardDescription>
                        {t("createNewDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form action={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="name">{t("workspaceName")}</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="e.g., Family Budget, Household"
                                required
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>{t("workspaceType")}</Label>
                            <RadioGroup defaultValue="personal" name="type" className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="personal" id="personal" className="peer sr-only" />
                                    <Label
                                        htmlFor="personal"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                                    >
                                        <User className="mb-3 h-6 w-6" />
                                        <div className="text-sm font-semibold">{t("personal")}</div>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="business" id="business" className="peer sr-only" />
                                    <Label
                                        htmlFor="business"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                                    >
                                        <Briefcase className="mb-3 h-6 w-6" />
                                        <div className="text-sm font-semibold">{t("business")}</div>
                                    </Label>
                                </div>
                            </RadioGroup>
                            <p className="text-[0.8rem] text-muted-foreground">
                                {t("typeDescription")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">{common("currency")}</Label>
                            <Select name="currency" defaultValue="USD" disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder={common("search")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="MAD">MAD (DH)</SelectItem>
                                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                                    <SelectItem value="SAR">SAR (﷼)</SelectItem>
                                    <SelectItem value="CAD">CAD ($)</SelectItem>
                                    <SelectItem value="CHF">CHF (Fr)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                    <SelectItem value="CNY">CNY (¥)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? common("creating") : t("createWorkspace")}
                        </Button>
                    </form>

                    <div className="pt-4 border-t text-center">
                        <form action={signOut}>
                            <Button variant="ghost" size="sm" type="submit">
                                <LogOut className="h-4 w-4 me-2" />
                                {auth("signOut")}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card >
        </div >
    );
}

