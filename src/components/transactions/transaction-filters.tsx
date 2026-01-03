"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MemberProfile } from "@/lib/actions/workspace";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

interface Account {
    id: string;
    name: string;
}

interface TransactionFiltersProps {
    accounts: Account[];
    vendors?: string[];
    members?: MemberProfile[];
}

export function TransactionFilters({
    accounts,
    vendors = [],
    members = []
}: TransactionFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Parse Initial State
    const accountId = searchParams.get("accountId") || "all";
    const vendorParam = searchParams.get("vendor");
    const createdByParam = searchParams.get("createdBy");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const monthParam = searchParams.get("month");

    // Initialize Date Range
    const [date, setDate] = useState<DateRange | undefined>(() => {
        if (startDateParam && endDateParam) {
            return {
                from: parseISO(startDateParam),
                to: parseISO(endDateParam),
            };
        }
        if (monthParam) {
            const m = parseISO(monthParam + "-01"); // YYYY-MM -> YYYY-MM-01
            return {
                from: startOfMonth(m),
                to: endOfMonth(m),
            };
        }
        // Default to current month if nothing
        const now = new Date();
        return {
            from: startOfMonth(now),
            to: endOfMonth(now),
        };
    });

    const [openVendor, setOpenVendor] = useState(false);

    // Apply Filters
    const createQueryString = useCallback(
        (params: Record<string, string | null>) => {
            const newSearchParams = new URLSearchParams(searchParams.toString());

            Object.entries(params).forEach(([key, value]) => {
                if (value === null) {
                    newSearchParams.delete(key);
                } else {
                    newSearchParams.set(key, value);
                }
            });

            return newSearchParams.toString();
        },
        [searchParams]
    );

    const applyFilters = (updates: Record<string, string | null>) => {
        const query = createQueryString(updates);
        router.push(pathname + "?" + query);
    };

    // Handlers
    const handleAccountChange = (val: string) => {
        applyFilters({ accountId: val === "all" ? null : val });
    };

    const handleVendorSelect = (val: string) => {
        applyFilters({ vendor: val === "all" ? null : val });
        setOpenVendor(false);
    };

    const handleCreatedByChange = (val: string) => {
        applyFilters({ createdBy: val === "all" ? null : val });
    };

    const handleDateSelect = (range: DateRange | undefined) => {
        setDate(range);
        if (range?.from && range?.to) {
            applyFilters({
                startDate: format(range.from, "yyyy-MM-dd"),
                endDate: format(range.to, "yyyy-MM-dd"),
                month: null, // Clear month if specific range is set
            });
        } else if (!range) {
            // If cleared, maybe reset to default? or just clear params
            applyFilters({ startDate: null, endDate: null, month: null });
        }
    };

    return (
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
            {/* Date Range Picker */}
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateSelect}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Account Filter */}
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Account</Label>
                <Select value={accountId} onValueChange={handleAccountChange}>
                    <SelectTrigger className="w-[150px] h-9">
                        <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Vendor Filter */}
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Vendor</Label>
                <Popover open={openVendor} onOpenChange={setOpenVendor}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openVendor}
                            className="w-[150px] h-9 justify-between font-normal"
                        >
                            <span className="truncate">{vendorParam || "All Vendors"}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandInput placeholder="Search vendor..." />
                            <CommandList>
                                <CommandEmpty>No vendor found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all"
                                        onSelect={() => handleVendorSelect("all")}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                !vendorParam ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        All Vendors
                                    </CommandItem>
                                    {vendors.map((v) => (
                                        <CommandItem
                                            key={v}
                                            value={v}
                                            onSelect={() => handleVendorSelect(v)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    vendorParam === v ? "opacity-100" : "opacity-0"
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

            {/* Created By Filter */}
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Created By</Label>
                <Select value={createdByParam || "all"} onValueChange={handleCreatedByChange}>
                    <SelectTrigger className="w-[150px] h-9">
                        <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {members.map(m => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                                {m.first_name} {m.last_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Clear Filters Button (if any filter is active) */}
            {(accountId !== "all" || vendorParam || createdByParam || startDateParam || endDateParam) && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(pathname)}
                >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                </Button>
            )}
        </div>
    );
}
