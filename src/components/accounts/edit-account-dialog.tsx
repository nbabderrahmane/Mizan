"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccount } from "@/lib/actions/account";
import { Loader2 } from "lucide-react";
import { AccountWithBalance } from "@/lib/actions/account";

interface EditAccountDialogProps {
    account: AccountWithBalance;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({
    account,
    open,
    onOpenChange,
}: EditAccountDialogProps) {
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
            const result = await updateAccount(account.id, formData);
            if (!result.success) {
                setError(result.error?.message || "Failed to update account");
            } else {
                onOpenChange(false);
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Account</DialogTitle>
                    <DialogDescription>
                        Update account details. Changing the opening balance will affect the entire history.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Account Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="opening-balance">Opening Balance</Label>
                        <Input
                            id="opening-balance"
                            type="number"
                            step="0.01"
                            value={openingBalance}
                            onChange={(e) => setOpeningBalance(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Use this only if the initial setup was incorrect. For periodic checks, use "Reconcile" instead.
                        </p>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 font-medium">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
