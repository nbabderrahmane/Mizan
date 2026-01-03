"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Check, ChevronsUpDown } from "lucide-react";
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

    // Derived State
    const selectedAccount = accounts.find((a) => a.id === accountId);
    const isForeign = selectedAccount && currency !== selectedAccount.base_currency;
    const selectedCategory = categories.find((c) => c.id === categoryId);

    // Reset some fields when Type changes
    useEffect(() => {
        // Only clear if type changed from initial, OR if editing type explicitly.
        // For editing, we usually want to preserve values if they match the type.
        // But if switching types, clear category.
        // We'll trust user intent on type switch.
        if (type !== transaction.type) {
            setCategoryId("");
            setSubcategoryId("");
            setTransferAccountId("");
        }
    }, [type, transaction.type]);

    // Update currency defaults when Account changes if creating new? 
    // For editing, we probably want to keep existing currency unless explicitly changed, 
    // or if account changes drastically? 
    // Let's keep manual control for now to avoid overwriting existing data.

    // Fetch Vendors on Mount
    useEffect(() => {
        if (open) {
            getUniqueVendors(workspaceId).then(setVendors).catch(console.error);
        }
    }, [workspaceId, open]);

    // Auto-fetch FX Rate only on CURRENCY CHANGE (not on opening existing)
    // We only fetch if currency is different from transaction's initial currency
    // to avoid overwriting user's previous manual adjustment on open.
    useEffect(() => {
        if (isForeign && selectedAccount && currency !== transaction.original_currency) {
            handleFetchRate();
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
            console.error("Failed to fetch rate:", err);
        } finally {
            setIsFetchingRate(false);
        }
    }

    async function handleSubmit() {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }
        if (!accountId) {
            setError("Please select an account");
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("type", type);
        formData.append("accountId", accountId);
        formData.append("date", date);
        formData.append("amount", amount); // Action expects abs amount
        formData.append("currency", currency);
        formData.append("description", description);
        if (title) formData.append("title", title);
        if (vendor) formData.append("vendor", vendor);

        if (categoryId) formData.append("categoryId", categoryId);
        if (subcategoryId) formData.append("subcategoryId", subcategoryId);
        if (transferAccountId) formData.append("transferAccountId", transferAccountId);
        if (isForeign) formData.append("fxRate", fxRate);

        const result = await updateTransaction(transaction.id, formData, workspaceId);

        setIsLoading(false);

        if (result.success) {
            onOpenChange(false);
            onSuccess?.();
            router.refresh(); // Refresh server data
        } else {
            setError(result.error?.message || "Failed to update transaction");
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[500px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Edit Transaction</SheetTitle>
                    <SheetDescription>
                        Update transaction details.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            className={cn(
                                "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
                                type === 'expense' ? "bg-background shadow text-red-600" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setType("expense")}
                        >
                            Outcome
                        </button>
                        <button
                            className={cn(
                                "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
                                type === 'income' ? "bg-background shadow text-green-600" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setType("income")}
                        >
                            Income
                        </button>
                        <button
                            className={cn(
                                "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
                                type === 'transfer' ? "bg-background shadow text-blue-600" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setType("transfer")}
                        >
                            Transfer
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title (Optional)</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Weekly Groceries"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={cn(
                                        "font-semibold",
                                        type === 'expense' && "text-red-500",
                                        type === 'income' && "text-green-500",
                                        type === 'transfer' && "text-blue-500"
                                    )}
                                />
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

                        {isForeign && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                                <Label className="text-amber-800 dark:text-amber-200">Exchange Rate</Label>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-muted-foreground">1 {currency} =</span>
                                    <div className="relative flex-1 max-w-[120px]">
                                        <Input
                                            type="number"
                                            value={fxRate}
                                            onChange={(e) => setFxRate(e.target.value)}
                                            className="h-8 pr-8"
                                            step="0.0001"
                                            disabled={isFetchingRate}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleFetchRate}
                                            disabled={isFetchingRate}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                            title="Refresh Rate"
                                        >
                                            <Loader2 className={cn("h-3 w-3", isFetchingRate && "animate-spin")} />
                                        </button>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{selectedAccount?.base_currency}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Base Amount: {selectedAccount?.base_currency} {(parseFloat(amount || "0") * parseFloat(fxRate || "0")).toFixed(2)}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Account</Label>
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.base_currency})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {type === "transfer" ? (
                            <div className="space-y-2">
                                <Label>To Account</Label>
                                <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select target account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.filter(a => a.id !== accountId).map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.base_currency})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={categoryId || "uncategorized"} onValueChange={(val) => setCategoryId(val === "uncategorized" ? "" : val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                            {filteredCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Subcategory</Label>
                                    <Select value={subcategoryId || "none"} onValueChange={(val) => setSubcategoryId(val === "none" ? "" : val)} disabled={!categoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select subcategory" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {selectedCategory?.subcategories.map(sub => (
                                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 flex flex-col">
                            <Label className="mb-1">Vendor / Payee</Label>
                            <Popover open={openVendor} onOpenChange={setOpenVendor}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openVendor}
                                        className="w-full justify-between font-normal"
                                    >
                                        {vendor || <span className="text-muted-foreground">Select vendor...</span>}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search vendor..." value={vendor} onValueChange={setVendor} />
                                        <CommandList>
                                            <CommandEmpty className="py-2 px-2">
                                                <p className="text-sm text-muted-foreground mb-2 px-2">No vendor found.</p>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full h-8"
                                                    onClick={() => {
                                                        setVendor(vendor);
                                                        setOpenVendor(false);
                                                    }}
                                                >
                                                    Use "{vendor}"
                                                </Button>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {vendors.map((v) => (
                                                    <CommandItem
                                                        key={v}
                                                        value={v}
                                                        onSelect={(currentValue) => {
                                                            setVendor(currentValue);
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

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Lunch at ..."
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-destructive">{error}</div>
                        )}
                    </div>
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
