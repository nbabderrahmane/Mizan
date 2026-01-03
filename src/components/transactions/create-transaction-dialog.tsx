"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ArrowRight, Wallet, TrendingUp, TrendingDown, Check, ChevronsUpDown } from "lucide-react";
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
import { createTransaction, getUniqueVendors } from "@/lib/actions/transaction";
import { fetchFxRateAction } from "@/lib/services/fx";

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

interface CreateTransactionDialogProps {
    workspaceId: string;
    accounts: Account[];
    categories: Category[];
}

const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "AED"];

export function CreateTransactionDialog({
    workspaceId,
    accounts,
    categories,
}: CreateTransactionDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
    const [accountId, setAccountId] = useState(accounts[0]?.id || "");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState(accounts[0]?.base_currency || "USD");
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

    // Filtered Categories
    const filteredCategories = categories.filter(c => !c.type || c.type === type);

    // Derived State
    const selectedAccount = accounts.find((a) => a.id === accountId);
    const isForeign = selectedAccount && currency !== selectedAccount.base_currency;
    const selectedCategory = categories.find((c) => c.id === categoryId);

    // Reset some fields when Type changes
    useEffect(() => {
        setCategoryId("");
        setSubcategoryId("");
        setTransferAccountId("");
    }, [type]);

    // Update currency defaults when Account changes
    useEffect(() => {
        if (selectedAccount) {
            setCurrency(selectedAccount.base_currency);
        }
    }, [accountId, accounts]);

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

        setIsLoading(false);

        if (result.success) {
            setOpen(false);
            router.refresh();
            setAmount("");
            setDescription("");
            setTitle("");
            setVendor("");
        } else {
            setError(result.error?.message || "Failed to create transaction");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>
                        Record a new expense, income, or transfer.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex bg-muted p-1 rounded-lg mb-4">
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

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Subcategory</Label>
                                    <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select subcategory" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedCategory?.subcategories.map(sub => (
                                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Vendor / Payee</Label>
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
                                    <PopoverContent className="w-[300px] p-0" align="start">
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
                        </>
                    )}

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

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Transaction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
