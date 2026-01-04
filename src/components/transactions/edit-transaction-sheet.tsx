"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Check, ChevronsUpDown, ArrowRightLeft, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { updateTransaction, getUniqueVendors } from "@/lib/actions/transaction";
import { fetchFxRateAction } from "@/lib/services/fx";
import type { Transaction } from "@/lib/actions/transaction";
import { useLocale, useTranslations } from "next-intl";

interface Account {
    id: string;
    name: string;
    base_currency: string;
}

interface Category {
    id: string;
    name: string;
    type?: string | null;
    subcategories: { id: string; name: string }[];
}

interface EditTransactionSheetProps {
    workspaceId: string;
    transaction: Transaction;
    accounts: Account[];
    categories: Category[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "AED"];

export function EditTransactionSheet({
    workspaceId,
    transaction,
    accounts,
    categories,
    open,
    onOpenChange,
    onSuccess,
}: EditTransactionSheetProps) {
    const t = useTranslations("Transactions");
    const common = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [type, setType] = useState<"expense" | "income" | "transfer">(transaction.type);
    const [accountId, setAccountId] = useState(transaction.account_id);
    const [date, setDate] = useState(transaction.date || new Date().toISOString().split("T")[0]);
    const [amount, setAmount] = useState(Math.abs(transaction.original_amount).toString());
    const [currency, setCurrency] = useState(transaction.original_currency || "USD");
    const [description, setDescription] = useState(transaction.description || "");
    const [categoryId, setCategoryId] = useState(transaction.category_id || "");
    const [subcategoryId, setSubcategoryId] = useState(transaction.subcategory_id || "");
    const [transferAccountId, setTransferAccountId] = useState(transaction.transfer_account_id || "");
    const [fxRate, setFxRate] = useState(transaction.fx_rate_used?.toString() || "1.0");
    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const [title, setTitle] = useState(transaction.title || "");
    const [vendor, setVendor] = useState(transaction.vendor || "");

    // Vendor Autocomplete
    const [vendors, setVendors] = useState<string[]>([]);
    const [openVendor, setOpenVendor] = useState(false);

    // Filtered Categories
    const filteredCategories = categories.filter(c => !c.type || c.type === type);

    const selectedAccount = accounts.find(a => a.id === accountId);
    const isForeign = selectedAccount && currency !== selectedAccount.base_currency;

    useEffect(() => {
        if (open) {
            getUniqueVendors(workspaceId).then(setVendors).catch(console.error);
        }
    }, [workspaceId, open]);

    useEffect(() => {
        // Only fetch rate if user changes currency/account to something foreign that wasn't there before
        // or let's just always allow them to refresh if they want
    }, [currency, accountId]);

    async function handleFetchRate() {
        if (!selectedAccount || currency === selectedAccount.base_currency) return;

        setIsFetchingRate(true);
        try {
            const result = await fetchFxRateAction(currency, selectedAccount.base_currency);
            if (result.success && result.rate) {
                setFxRate(result.rate.toString());
            }
        } catch (err) {
            console.error("FX fetch failed", err);
        } finally {
            setIsFetchingRate(false);
        }
    }

    async function handleSubmit() {
        if (!amount || parseFloat(amount) <= 0) {
            setError(t("invalidAmount"));
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("type", type);
        formData.append("accountId", accountId);
        formData.append("date", date);
        formData.append("amount", amount);
        formData.append("currency", currency);
        formData.append("description", description);
        if (title) formData.append("title", title);
        if (vendor) formData.append("vendor", vendor);

        if (categoryId) formData.append("categoryId", categoryId);
        if (subcategoryId) formData.append("subcategoryId", subcategoryId);
        if (transferAccountId) formData.append("transferAccountId", transferAccountId);
        if (isForeign) formData.append("fxRate", fxRate);

        const result = await updateTransaction(transaction.id, formData);

        setIsLoading(false);

        if (result.success) {
            onOpenChange(false);
            router.refresh();
            onSuccess?.();
        } else {
            setError(result.error?.message || common("error"));
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[450px] overflow-y-auto">
                <SheetHeader className="pb-6">
                    <SheetTitle>{t("editTransaction")}</SheetTitle>
                    <SheetDescription>
                        {t("addTransactionDesc")}
                    </SheetDescription>
                </SheetHeader>

                <div className="grid gap-6 py-4">
                    {/* Type Selector */}
                    <div className="flex p-1 bg-muted rounded-lg">
                        <button
                            onClick={() => setType("expense")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                type === "expense" ? "bg-background shadow-sm text-rose-600" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <TrendingDown className="h-4 w-4" />
                            {t("expense")}
                        </button>
                        <button
                            onClick={() => setType("income")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                type === "income" ? "bg-background shadow-sm text-emerald-600" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <TrendingUp className="h-4 w-4" />
                            {t("income")}
                        </button>
                        <button
                            onClick={() => setType("transfer")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                type === "transfer" ? "bg-background shadow-sm text-blue-600" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ArrowRightLeft className="h-4 w-4" />
                            {t("transfer")}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("date")}</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{type === 'transfer' ? t("fromAccount") : t("account")}</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name} ({acc.base_currency})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {type === 'transfer' && (
                        <div className="space-y-2">
                            <Label>{t("toAccount")}</Label>
                            <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("selectAccount")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.filter(a => a.id !== accountId).map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name} ({acc.base_currency})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label>{t("amount")}</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-9 text-lg font-bold"
                                />
                                <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
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

                    {isForeign && (
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("fxRate")}</span>
                                <div className="flex items-center gap-2">
                                    {isFetchingRate && <Loader2 className="h-3 w-3 animate-spin" />}
                                    <Input
                                        className="h-7 w-20 text-right font-mono"
                                        value={fxRate}
                                        onChange={(e) => setFxRate(e.target.value)}
                                    />
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFetchRate}>
                                        <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm font-medium">
                                <span>Total in {selectedAccount?.base_currency}</span>
                                <span>
                                    {new Intl.NumberFormat(locale, { style: 'currency', currency: selectedAccount?.base_currency || 'USD' }).format(
                                        (parseFloat(amount) || 0) * (parseFloat(fxRate) || 1)
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    {type !== 'transfer' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("category")}</Label>
                                    <Select value={categoryId} onValueChange={(val) => {
                                        setCategoryId(val);
                                        setSubcategoryId("");
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredCategories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Subcategory</Label>
                                    <Select
                                        value={subcategoryId}
                                        onValueChange={setSubcategoryId}
                                        disabled={!categoryId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.find(c => c.id === categoryId)?.subcategories.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id}>
                                                    {sub.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("vendor")}</Label>
                                <Popover open={openVendor} onOpenChange={setOpenVendor}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openVendor}
                                            className="w-full justify-between font-normal"
                                        >
                                            {vendor || t("searchVendors")}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder={t("searchVendors")}
                                                value={vendor}
                                                onValueChange={(val) => {
                                                    setVendor(val);
                                                    setTitle(val);
                                                }}
                                            />
                                            <CommandList>
                                                <CommandEmpty>{common("notFound")}</CommandEmpty>
                                                <CommandGroup>
                                                    {vendors.map((v) => (
                                                        <CommandItem
                                                            key={v}
                                                            value={v}
                                                            onSelect={(currentValue) => {
                                                                setVendor(currentValue);
                                                                setTitle(currentValue);
                                                                setOpenVendor(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    vendor === v ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {v}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label>{t("note")}</Label>
                        <Input
                            placeholder="Dinner at Mama's"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-600 font-medium">
                            {error}
                        </div>
                    )}
                </div>

                <SheetFooter className="pt-6">
                    <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                        {common("cancel")}
                    </Button>
                    <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {common("save")}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
