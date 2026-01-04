"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { updateBudget } from "@/lib/actions/budget";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface EditBudgetDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspaceId: string;
    budget: any;
    onSuccess: (updatedBudget: any) => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "AED"];

export function EditBudgetDialog({ open, setOpen, workspaceId, budget, onSuccess }: EditBudgetDialogProps) {
    const t = useTranslations("Budgets");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [name, setName] = useState(budget?.name || "");
    const [amount, setAmount] = useState(budget?.monthly_cap?.toString() || "");
    const [currency, setCurrency] = useState(budget?.currency || "USD");
    const [isRecurring, setIsRecurring] = useState(budget?.is_recurring || false);

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        const res = await updateBudget(workspaceId, budget.id, {
            name,
            monthlyCap: parseFloat(amount),
            isRecurring
        });

        setIsLoading(false);

        if (res.success) {
            onSuccess(res.data);
            setOpen(false);
        } else {
            setError(res.error?.message || common("error"));
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("editBudget")}</DialogTitle>
                    <DialogDescription>
                        {t("editBudgetDesc", { name: budget?.name })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">{t("budgetName")}</Label>
                        <Input
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label>{t("amount")}</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{common("currency")}</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="edit-recurring"
                            checked={isRecurring}
                            onCheckedChange={(val: any) => setIsRecurring(val)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="edit-recurring"
                                className="text-sm font-medium"
                            >
                                {t("recurringPAYG")}
                            </label>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        {common("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !name || !amount}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {common("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
