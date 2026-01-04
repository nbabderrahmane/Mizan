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
import { useLocale, useTranslations } from "next-intl";

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
    const t = useTranslations("Budgets");
    const common = useTranslations("Common");
    const locale = useLocale();
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
            onSuccess(res.data);
        } else {
            setError(res.error?.message || common("error"));
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("createBudget")}</DialogTitle>
                    <DialogDescription>
                        {t("createBudgetDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t("budgetName")}</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Monthly Groceries"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{common("subcategory")}</Label>
                            <Select value={subcategoryId || ""} onValueChange={setSubcategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("selectSubcategory")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <div key={cat.id}>
                                            <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase bg-muted/30">
                                                {cat.name}
                                            </div>
                                            {cat.subcategories.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id} className="pl-6">
                                                    {sub.name}
                                                </SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>{t("amount")}</Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
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

                        <div className="space-y-3">
                            <Label>{t("strategyType")}</Label>
                            <RadioGroup value={type} onValueChange={(val: any) => setType(val)} className="grid grid-cols-1 gap-3">
                                <div>
                                    <RadioGroupItem value="PAYG" id="payg" className="peer sr-only" />
                                    <Label
                                        htmlFor="payg"
                                        className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Zap className="h-5 w-5 text-rose-500" />
                                            <span className="font-bold">{t("directSpend")}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t("paygDesc")}
                                        </p>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="PLAN_SPEND" id="plan_spend" className="peer sr-only" />
                                    <Label
                                        htmlFor="plan_spend"
                                        className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Target className="h-5 w-5 text-emerald-500" />
                                            <span className="font-bold">{t("planSpend")}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t("planSpendDesc")}
                                        </p>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    {type === "PAYG" ? (
                        <div className="flex items-center space-x-2 p-4 bg-muted/40 rounded-lg">
                            <Checkbox
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={(val: any) => setIsRecurring(val)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="recurring"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {t("recurringPAYG")}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    {t("recurringPAYGDesc")}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 p-4 bg-muted/40 rounded-lg">
                            <div className="space-y-2">
                                <Label>{t("dueDate")}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dueDate ? format(dueDate, "PPP", { locale: undefined }) : <span>{t("pickDate")}</span>}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("recurrence")}</Label>
                                    <Select value={recurrence} onValueChange={setRecurrence}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="None">{t("recurrenceNone")}</SelectItem>
                                            <SelectItem value="Monthly">{t("recurrenceMonthly")}</SelectItem>
                                            <SelectItem value="Quarterly">{t("recurrenceQuarterly")}</SelectItem>
                                            <SelectItem value="Yearly">{t("recurrenceYearly")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("startPolicy")}</Label>
                                    <Select value={startPolicy} onValueChange={setStartPolicy}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="start_this_month">{t("startThisMonth")}</SelectItem>
                                            <SelectItem value="start_next_month">{t("startNextMonth")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="safe"
                                    checked={allowUseSafe}
                                    onCheckedChange={(val: any) => setAllowUseSafe(val)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor="safe" className="text-sm font-medium">{t("allowUseSafe")}</label>
                                    <p className="text-xs text-muted-foreground">
                                        {t("allowUseSafeDesc")}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="autofund"
                                        checked={autoFund}
                                        onCheckedChange={(val: any) => setAutoFund(val)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label htmlFor="autofund" className="text-sm font-medium">{t("autoFund")}</label>
                                        <p className="text-xs text-muted-foreground">
                                            {t("autoFundDesc")}
                                        </p>
                                    </div>
                                </div>

                                {autoFund && (
                                    <div className="space-y-2">
                                        <Label>{t("fundingAccount")}</Label>
                                        <Select value={fundingAccountId} onValueChange={setFundingAccountId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("selectAccount")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.base_currency})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            {t("fundingTip")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {calculation && !calculation.error && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-2">
                                        <Target className="h-3.5 w-3.5" />
                                        {t("calculationTip", { target: formatCurrency(parseFloat(amount)), date: format(dueDate!, "MMM yyyy") })}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-background/50 p-2 rounded">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("monthlyContribution")}</p>
                                            <p className="text-lg font-bold text-emerald-600">
                                                {formatCurrency(calculation.monthlyAmount || 0)}
                                            </p>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("duration")}</p>
                                            <p className="text-lg font-bold">
                                                {calculation.totalMonths} {common("months")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        {common("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !name || !amount || !subcategoryId || (type === "PLAN_SPEND" && !dueDate)}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoading ? common("creating") : common("create")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
