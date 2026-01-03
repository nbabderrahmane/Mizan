"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reconcileAccount } from "@/lib/actions/account";
import { Loader2, AlertTriangle } from "lucide-react";
import { AccountWithBalance } from "@/lib/actions/account";

interface ReconcileAccountDialogProps {
    account: AccountWithBalance;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReconcileAccountDialog({
    account,
    open,
    onOpenChange,
}: ReconcileAccountDialogProps) {
    const [actualBalance, setActualBalance] = useState<string>(account.available.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const systemBalance = account.available; // Assuming we reconcile 'available' balance
    const diff = (parseFloat(actualBalance) || 0) - systemBalance;
    const isAdjustmentNeeded = Math.abs(diff) > 0.01;

    async function handleReconcile() {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await reconcileAccount(account.id, parseFloat(actualBalance));
            if (!result.success) {
                setError(result.error?.message || "Failed to reconcile");
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
                    <DialogTitle>Reconcile {account.name}</DialogTitle>
                    <DialogDescription>
                        Match the system balance with your actual bank/cash balance. An adjustment transaction will be created if they differ.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>System Balance</Label>
                            <div className="text-2xl font-bold mt-1 text-muted-foreground">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.base_currency }).format(systemBalance)}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="actual-balance">Actual Balance</Label>
                        <Input
                            id="actual-balance"
                            type="number"
                            step="0.01"
                            value={actualBalance}
                            onChange={(e) => setActualBalance(e.target.value)}
                            className="text-lg font-medium"
                        />
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-amber-500/10 text-amber-600 rounded-md text-sm border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>
                            Reconciling will lock all transactions UP TO THIS MOMENT. New transactions created after this point will remain editable.
                        </p>
                    </div>

                    {isAdjustmentNeeded && (
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-muted-foreground">Difference</span>
                                <span className={diff > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                    {diff > 0 ? "+" : ""}{new Intl.NumberFormat('en-US', { style: 'currency', currency: account.base_currency }).format(diff)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                A {diff > 0 ? "Income" : "Expense"} transaction will be created to adjust the balance.
                            </p>
                        </div>
                    )}

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
                    <Button onClick={handleReconcile} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Reconciling...
                            </>
                        ) : (
                            isAdjustmentNeeded ? "Confirm Adjustment" : "Verify & Lock"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
