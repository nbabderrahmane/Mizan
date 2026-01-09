"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ArrowRight, Wallet, TrendingUp, TrendingDown, Check, ChevronsUpDown, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
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
import { createTransaction, getUniqueVendors } from "@/lib/actions/transaction";
import { fetchFxRateAction } from "@/lib/services/fx";
import { BudgetWithConfigs } from "@/lib/validations/budget";
import { useLocale, useTranslations } from "next-intl";
import { MagicDraftButton } from "@/components/ai/MagicDraftButton";
import { MagicDraftDrawer } from "@/components/ai/MagicDraftDrawer";
import { DraftTransaction } from "@/lib/local-ai/types";

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

interface PrefilledPayment {
    id: string;
    name: string;
    subcategory_id: string;
    due_date: string;
    amount: number;
    currency: string;
}

interface CreateTransactionDialogProps {
    workspaceId: string;
    accounts: Account[];
    categories: Category[];
    workspaceCurrency?: string;
    budgets?: BudgetWithConfigs[];
    prefilled?: PrefilledPayment | null;
    onClose?: () => void;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "AED"];

export function CreateTransactionDialog({
    workspaceId,
    accounts,
    categories,
    workspaceCurrency = "USD",
    budgets = [],
    prefilled,
    onClose,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
}: CreateTransactionDialogProps) {
    const t = useTranslations("Transactions");
    const common = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const [internalOpen, setInternalOpen] = useState(false);
    const [magicOpen, setMagicOpen] = useState(false);

    // Feature Flag: Only enable locally or if explicitly set
    const ENABLE_LOCAL_AI = process.env.NEXT_PUBLIC_ENABLE_LOCAL_AI === 'true';

    const handleMagicDraft = (draft: DraftTransaction) => {
        setType(draft.type);
        if (draft.amount) setAmount(draft.amount.toString());
        if (draft.currency) setCurrency(draft.currency);
        if (draft.vendor) {
            setVendor(draft.vendor);
            setTitle(draft.vendor);
        }
        if (draft.category_guess) {
            // Simple match by name for V1
            const lowerGuess = draft.category_guess.toLowerCase();
            const cat = categories.find(c => c.name.toLowerCase().includes(lowerGuess));
            if (cat) {
                setCategoryId(cat.id);
                // Try subcategory guess if available
                if (draft.category_guess) {
                    // This is simple logic, can be improved
                }
            }
        }
        if (draft.note) setDescription(draft.note);
        setMagicOpen(false);
    };

    const open = controlledOpen ?? internalOpen;
    const setOpen = setControlledOpen ?? setInternalOpen;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
    const [accountId, setAccountId] = useState(accounts[0]?.id || "");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState(accounts[0]?.base_currency || workspaceCurrency);
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [subcategoryId, setSubcategoryId] = useState("");
    const [transferAccountId, setTransferAccountId] = useState("");
    const [fxRate, setFxRate] = useState("1.0");
    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const [title, setTitle] = useState("");
    const [vendor, setVendor] = useState("");

    // Vendor Autocomplete
    const [vendors, setVendors] = useState<string[]>([]);
    const [openVendor, setOpenVendor] = useState(false);

    // Filtered Categories based on transaction type
    const filteredCategories = categories.filter(c => !c.type || c.type === type);

    const selectedAccount = accounts.find(a => a.id === accountId);
    const isForeign = selectedAccount && currency !== selectedAccount.base_currency;

    // Prefill logic
    useEffect(() => {
        if (prefilled) {
            setOpen(true);
            setType("expense");
            setAmount(prefilled.amount.toString());
            setCurrency(prefilled.currency);
            setTitle(prefilled.name);
            setVendor(prefilled.name);
            setDate(prefilled.due_date);

            // Find category from subcategory
            for (const cat of categories) {
                const sub = cat.subcategories.find(s => s.id === prefilled.subcategory_id);
                if (sub) {
                    setCategoryId(cat.id);
                    setSubcategoryId(sub.id);
                    break;
                }
            }
        }
    }, [prefilled, categories]);

    // Call onClose when dialog closes
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen && onClose) {
            onClose();
        }
    };

    useEffect(() => {
        if (open) {
            getUniqueVendors(workspaceId).then(setVendors).catch(console.error);
        }
    }, [workspaceId, open]);

    useEffect(() => {
        if (isForeign && selectedAccount) {
            handleFetchRate();
        } else {
            setFxRate("1.0");
        }
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
        if (!accountId) {
            setError(t("selectAccount"));
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

        const result = await createTransaction(workspaceId, formData);

        setIsLoading(true); // Wait for refresh

        if (result.success) {
            setOpen(false);
            router.refresh();
            setAmount("");
            setDescription("");
            setTitle("");
            setVendor("");
            setIsLoading(false);
        } else {
            setError(result.error?.message || common("error"));
            setIsLoading(false);
        }
    }

    /*
    const handleMagicDraft = (draft: DraftTransaction) => {
        setType(draft.type);
        if (draft.amount) setAmount(draft.amount.toString());
        if (draft.currency) setCurrency(draft.currency);
        if (draft.vendor) {
            setVendor(draft.vendor);
            setTitle(draft.vendor);
        }
        if (draft.category_guess) {
            // Simple match by name for V1
            const lowerGuess = draft.category_guess.toLowerCase();
            const cat = categories.find(c => c.name.toLowerCase().includes(lowerGuess));
            if (cat) {
                 setCategoryId(cat.id);
                 // Try subcategory guess if available
                 if (draft.category_guess) { 
                    // This is simple logic, can be improved
                 }
            }
        }
        if (draft.note) setDescription(draft.note);
    };
    */

    const isControlled = controlledOpen !== undefined;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {/* Only render trigger if explicitly provided OR if we are NOT in controlled mode */}
            {(trigger || !isControlled) && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button className="w-full">
                            <Plus className="me-2 h-4 w-4" />
                            {t("newTransaction")}
                        </Button>
                    )}
                </DialogTrigger>
            )}

            {ENABLE_LOCAL_AI && (
                <MagicDraftDrawer
                    open={magicOpen}
                    onOpenChange={setMagicOpen}
                    onDraft={handleMagicDraft}
                />
            )}

            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle>{t("addTransaction")}</DialogTitle>
                            <DialogDescription>
                                {t("addTransactionDesc")}
                            </DialogDescription>
                        </div>
                        {ENABLE_LOCAL_AI && (
                            <MagicDraftButton onClick={() => setMagicOpen(true)} />
                        )}
                    </div>
                </DialogHeader>

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
                                    className="ps-9 text-lg font-bold"
                                />
                                <Wallet className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                            </div>
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

                    {isForeign && (
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("fxRate")}</span>
                                <div className="flex items-center gap-2">
                                    {isFetchingRate && <Loader2 className="h-3 w-3 animate-spin" />}
                                    <Input
                                        className="h-7 w-20 text-end font-mono"
                                        value={fxRate}
                                        onChange={(e) => setFxRate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm font-medium">
                                <span>{t("totalIn", { currency: selectedAccount?.base_currency || "" })}</span>
                                <span>
                                    {new Intl.NumberFormat(locale, { style: 'currency', currency: selectedAccount?.base_currency }).format(
                                        (parseFloat(amount) || 0) * (parseFloat(fxRate) || 0)
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    {type !== 'transfer' && (
                        <>
                            <div className="space-y-2">
                                <Label>{t("subcategory")}</Label>
                                <Select
                                    value={subcategoryId}
                                    onValueChange={(subId) => {
                                        setSubcategoryId(subId);
                                        // Auto-select parent category
                                        for (const cat of categories) {
                                            if (cat.subcategories.some(s => s.id === subId)) {
                                                setCategoryId(cat.id);
                                                break;
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("selectSubcategory")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredCategories.map((cat) => (
                                            <SelectGroup key={cat.id}>
                                                <SelectLabel className="text-sm font-bold text-foreground px-2 py-2">{cat.name}</SelectLabel>
                                                {cat.subcategories.map((sub) => (
                                                    <SelectItem key={sub.id} value={sub.id} className="ps-4">
                                                        {sub.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] p-0">
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
                                                <CommandEmpty>
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-start text-xs"
                                                        onClick={() => setOpenVendor(false)}
                                                    >
                                                        {common("add")} "{vendor}"
                                                    </Button>
                                                </CommandEmpty>
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
                                                                    "me-2 h-4 w-4",
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
                            placeholder={t("notePlaceholder")}
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

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        {common("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        {t("addTransaction")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
