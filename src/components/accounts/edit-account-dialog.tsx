"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccount } from "@/lib/actions/account";
import { Loader2 } from "lucide-react";
import { Account } from "@/lib/actions/account";
import { useTranslations } from "next-intl";

interface EditAccountDialogProps {
    workspaceId: string;
    account: Account;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({
    workspaceId,
    account,
    open,
    onOpenChange,
}: EditAccountDialogProps) {
    const t = useTranslations("Accounts");
    const common = useTranslations("Common");
    const [name, setName] = useState(account.name);
    const [openingBalance, setOpeningBalance] = useState(account.opening_balance.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when account prop changes or dialog opens
    useEffect(() => {
        if (open) {
            setName(account.name);
            setOpeningBalance(account.opening_balance.toString());
            setError(null);
        }
    }, [open, account]);

    async function handleUpdate() {
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.append("name", name);
        formData.append("opening_balance", openingBalance);

        try {
            const result = await updateAccount(account.id, formData, workspaceId);
            if (!result.success) {
                setError(result.error?.message || common("error"));
            } else {
                onOpenChange(false);
            }
        } catch (err) {
            setError(common("error"));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("editAccount")}</DialogTitle>
                    <DialogDescription>
                        {t("editDescription")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t("accountName")}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="opening-balance">{t("openingBalance")}</Label>
                        <Input
                            id="opening-balance"
                            type="number"
                            step="0.01"
                            value={openingBalance}
                            onChange={(e) => setOpeningBalance(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 font-medium">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {common("cancel")}
                    </Button>
                    <Button onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {common("saving")}
                            </>
                        ) : (
                            common("save")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
