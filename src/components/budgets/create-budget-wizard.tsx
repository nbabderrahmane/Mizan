"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { createBudget } from "@/lib/actions/budget";
import { Loader2, Zap, Target, Check, CalendarIcon } from "lucide-react";
import { addMonths, format, startOfMonth, differenceInCalendarMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CategoryWithSubcategories } from "@/lib/actions/category";

interface CreateBudgetWizardProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspaceId: string;
    categories: CategoryWithSubcategories[];
    accounts?: any[];
    workspaceCurrency?: string;
    onSuccess: (newBudget: any) => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "AED"];

export function CreateBudgetWizard({ open, setOpen, workspaceId, categories, accounts = [], workspaceCurrency = "USD", onSuccess }: CreateBudgetWizardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [name, setName] = useState("");
    const [subcategoryId, setSubcategoryId] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"PAYG" | "PLAN_SPEND">("PAYG");
    const [currency, setCurrency] = useState(workspaceCurrency);

    // PAYG Recurring
    const [isRecurring, setIsRecurring] = useState(false);

    // Plan & Spend Specifics
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [recurrence, setRecurrence] = useState("None");
    const [startPolicy, setStartPolicy] = useState("start_this_month");
    const [allowUseSafe, setAllowUseSafe] = useState(false);
    const [autoFund, setAutoFund] = useState(false);
    const [fundingAccountId, setFundingAccountId] = useState("");

    // Calculations for Plan & Spend
    const calculation = useMemo(() => {
        if (type !== "PLAN_SPEND" || !amount || !dueDate) return null;

        const target = parseFloat(amount);
        if (isNaN(target)) return null;

        const now = startOfMonth(new Date());
        const due = startOfMonth(dueDate);

        let start = now;
        if (startPolicy === "start_next_month") {
            start = addMonths(now, 1);
        }

        const totalMonths = differenceInCalendarMonths(due, start) + 1;
        if (totalMonths <= 0) return { error: "Due date must be in the future (or this month)." };

        const monthlyAmount = target / totalMonths;
        return { totalMonths, monthlyAmount };
    }, [type, amount, dueDate, startPolicy]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        const data = {
            name,
            subcategoryId,
            currency,
            type,
            monthlyCap: type === "PAYG" ? parseFloat(amount) : undefined,
            isRecurring: type === "PAYG" ? isRecurring : undefined,
            targetAmount: type === "PLAN_SPEND" ? parseFloat(amount) : undefined,
            dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
            recurrence,
            startPolicy,
            allowUseSafe,
            autoFund,
            fundingAccountId: autoFund ? fundingAccountId : undefined
        };

        const res = await createBudget(workspaceId, data);
        setIsLoading(false);

        if (res.success) {
            console.log("Budget created successfully:", res.data);
            onSuccess(res.data);
            resetForm();
            setOpen(false);
        } else {
            console.error("Budget creation failed:", res.error);
            setError(res.error?.message || "Something went wrong");
        }
    };

    const resetForm = () => {
        setName("");
        setSubcategoryId("");
        setAmount("");
        setType("PAYG");
        setCurrency(workspaceCurrency);
        setIsRecurring(false);
        setDueDate(undefined);
        setRecurrence("None");
        setStartPolicy("start_this_month");
        setAllowUseSafe(false);
        setAutoFund(false);
        setFundingAccountId("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[550px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Create New Budget</DialogTitle>
                    <DialogDescription>
                        Configure your spending cap or long-term financial plan.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-5">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Subcategory</Label>
                            <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select subcategory" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <div key={cat.id}>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                                                {cat.name}
                                            </div>
                                            {cat.subcategories.map(sub => (
                                                <SelectItem key={sub.id} value={sub.id}>
                                                    {sub.name}
                                                </SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{type === "PAYG" ? "Monthly Cap" : "Target Amount"}</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="text-lg font-semibold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Budget Name (Optional)</Label>
                            <Input
                                placeholder="e.g. Rent, Summer Trip"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Type Selection */}
                    <div className="space-y-3">
                        <Label>Strategy</Label>
                        <RadioGroup
                            value={type}
                            onValueChange={(v: any) => setType(v)}
                            className="grid grid-cols-2 gap-3"
                        >
                            <div className="relative">
                                <RadioGroupItem value="PAYG" id="payg" className="peer sr-only" />
                                <Label
                                    htmlFor="payg"
                                    className={cn(
                                        "flex flex-col items-center justify-center rounded-lg border-2 border-muted p-4 hover:bg-accent cursor-pointer transition-all",
                                        type === "PAYG" ? "border-primary bg-primary/5" : ""
                                    )}
                                >
                                    <Zap className={cn("mb-2 h-5 w-5", type === "PAYG" ? "text-primary" : "text-muted-foreground")} />
                                    <span className="font-semibold text-sm">Direct Spend</span>
                                    <span className="text-[10px] text-muted-foreground text-center line-clamp-1">Variable monthly cap</span>
                                </Label>
                            </div>
                            <div className="relative">
                                <RadioGroupItem value="PLAN_SPEND" id="plan_spend" className="peer sr-only" />
                                <Label
                                    htmlFor="plan_spend"
                                    className={cn(
                                        "flex flex-col items-center justify-center rounded-lg border-2 border-muted p-4 hover:bg-accent cursor-pointer transition-all",
                                        type === "PLAN_SPEND" ? "border-primary bg-primary/5" : ""
                                    )}
                                >
                                    <Target className={cn("mb-2 h-5 w-5", type === "PLAN_SPEND" ? "text-primary" : "text-muted-foreground")} />
                                    <span className="font-semibold text-sm">Financial Plan</span>
                                    <span className="text-[10px] text-muted-foreground text-center line-clamp-1">Goal with target date</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* PAYG Monthly Recurrence Option */}
                    {type === "PAYG" && (
                        <div className="flex items-center space-x-2 p-4 rounded-xl border bg-muted/30 animate-in fade-in slide-in-from-top-2">
                            <Checkbox
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={(checked) => setIsRecurring(checked === true)}
                            />
                            <Label htmlFor="recurring" className="text-sm cursor-pointer">
                                Recurring Monthly
                            </Label>
                            <span className="text-xs text-muted-foreground ml-auto">
                                Resets at the start of each month
                            </span>
                        </div>
                    )}

                    {/* Conditional Planning Specifics */}
                    {type === "PLAN_SPEND" && (
                        <div className="space-y-4 p-4 rounded-xl border bg-muted/30 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Target Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal bg-background",
                                                    !dueDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={dueDate}
                                                onSelect={setDueDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Recurrence</Label>
                                    <Select value={recurrence} onValueChange={setRecurrence}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="None">One-off goal</SelectItem>
                                            <SelectItem value="Monthly">Monthly</SelectItem>
                                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                                            <SelectItem value="Annual">Annual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Timing</Label>
                                    <Select value={startPolicy} onValueChange={setStartPolicy}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="start_this_month">Start this month</SelectItem>
                                            <SelectItem value="start_next_month">Start next month</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-8">
                                    <Checkbox
                                        id="allowSafe"
                                        checked={allowUseSafe}
                                        onCheckedChange={(c) => setAllowUseSafe(!!c)}
                                    />
                                    <Label htmlFor="allowSafe" className="text-xs cursor-pointer text-muted-foreground">
                                        Use Safe if Available is low
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-dashed">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="autoFund"
                                        checked={autoFund}
                                        onCheckedChange={(c) => setAutoFund(!!c)}
                                    />
                                    <Label htmlFor="autoFund" className="text-sm font-medium">
                                        Fund the first contribution immediately
                                    </Label>
                                </div>

                                {autoFund && (
                                    <div className="pl-6 space-y-2 animate-in slide-in-from-top-2 fade-in">
                                        <Label className="text-xs">Select Account (for record keeping)</Label>
                                        <Select value={fundingAccountId} onValueChange={setFundingAccountId}>
                                            <SelectTrigger className="bg-background">
                                                <SelectValue placeholder="Select account..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name} ({new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.base_currency }).format(acc.available ?? acc.opening_balance ?? 0)})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground">
                                            This will immediately reserve the first monthly amount from your available cash.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {calculation && (
                                <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                                    {calculation.error ? (
                                        <p className="text-xs text-destructive">{calculation.error}</p>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-muted-foreground">
                                                <span>Duration: </span>
                                                <span className="font-semibold text-foreground">{calculation.totalMonths} months</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Monthly Set Aside</p>
                                                <p className="text-lg font-bold text-primary">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(calculation.monthlyAmount || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <DialogFooter className="pt-2">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !subcategoryId || !amount || (type === "PLAN_SPEND" && (!dueDate || !!calculation?.error))}
                        className="min-w-[120px]"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="mr-2 h-4 w-4" />
                        )}
                        Create Budget
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
