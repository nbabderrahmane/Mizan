"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { updateBudget } from "@/lib/actions/budget";
import { BudgetWithConfigs } from "@/lib/validations/budget";
import { useToast } from "@/hooks/use-toast";

interface EditBudgetDialogProps {
    budget: BudgetWithConfigs;
    workspaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (updatedBudget: BudgetWithConfigs) => void;
}

export function EditBudgetDialog({
    budget,
    workspaceId,
    open,
    onOpenChange,
    onSuccess,
}: EditBudgetDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const isPAYG = budget.type === "PAYG";
    const paygConfig = Array.isArray(budget.payg_config) ? budget.payg_config[0] : budget.payg_config;
    const planConfig = Array.isArray(budget.plan_config) ? budget.plan_config[0] : budget.plan_config;

    const [name, setName] = useState(budget.name || "");
    const [amount, setAmount] = useState(
        isPAYG
            ? String(paygConfig?.monthly_cap || "")
            : String(planConfig?.target_amount || "")
    );
    const [isRecurring, setIsRecurring] = useState(
        (paygConfig as any)?.is_recurring ?? false
    );

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        const result = await updateBudget(workspaceId, budget.id, {
            name: name || undefined,
            monthlyCap: isPAYG ? parseFloat(amount) : undefined,
            targetAmount: !isPAYG ? parseFloat(amount) : undefined,
            isRecurring: isPAYG ? isRecurring : undefined,
        });

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Budget updated", description: "Your changes have been saved." });
            // Update local state with new values
            const updatedBudget = {
                ...budget,
                name: name || budget.name,
                payg_config: isPAYG
                    ? { ...paygConfig, monthly_cap: parseFloat(amount), is_recurring: isRecurring }
                    : budget.payg_config,
                plan_config: !isPAYG
                    ? { ...planConfig, target_amount: parseFloat(amount) }
                    : budget.plan_config,
            };
            onSuccess(updatedBudget as BudgetWithConfigs);
            onOpenChange(false);
        } else {
            toast({
                title: "Error",
                description: result.error?.message || "Failed to update budget",
                variant: "destructive",
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Budget</DialogTitle>
                    <DialogDescription>
                        Update the settings for "{budget.subcategory?.name}" budget.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Budget Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={budget.subcategory?.name || "Budget name"}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">
                            {isPAYG ? "Monthly Cap" : "Target Amount"} ({budget.currency})
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    {isPAYG && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={(checked) => setIsRecurring(checked === true)}
                            />
                            <Label htmlFor="recurring" className="text-sm cursor-pointer">
                                Recurring Monthly
                            </Label>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
