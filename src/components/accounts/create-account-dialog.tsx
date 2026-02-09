"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { createAccount } from "@/lib/actions/account";
import { accountTypes, personalAccountTypes, businessAccountTypes, commonCurrencies } from "@/lib/validations/account";
import { useTranslations } from "next-intl";

interface CreateAccountDialogProps {
    workspaceId: string;
    workspaceType: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateAccountDialog({
    workspaceId,
    workspaceType,
    open,
    onOpenChange,
    onSuccess,
}: CreateAccountDialogProps) {
    const t = useTranslations("Accounts");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableTypes = workspaceType === "business" ? businessAccountTypes : personalAccountTypes;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await createAccount(workspaceId, formData);

        setIsLoading(false);

        if (result.success) {
            onOpenChange(false);
            onSuccess?.();
        } else {
            setError(result.error?.message || common("error"));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("addAccount")}</DialogTitle>
                    <DialogDescription>
                        {t("addDescription")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t("accountName")}</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g., Main Checking"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">{t("type")}</Label>
                        <Select name="type" defaultValue="bank">
                            <SelectTrigger>
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {t(type as any) || type.charAt(0).toUpperCase() + type.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="base_currency">{t("currency")}</Label>
                        <Select name="base_currency" defaultValue="MAD">
                            <SelectTrigger>
                                <SelectValue placeholder={t("selectCurrency")} />
                            </SelectTrigger>
                            <SelectContent>
                                {commonCurrencies.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                        {currency}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="opening_balance">{t("openingBalance")}</Label>
                        <Input
                            id="opening_balance"
                            name="opening_balance"
                            type="number"
                            step="0.01"
                            defaultValue="0"
                            placeholder="0.00"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {common("cancel")}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? common("creating") : t("addAccount")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
