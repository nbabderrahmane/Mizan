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
import { useLocale, useTranslations } from "next-intl";

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
    const t = useTranslations("Transactions");
    const common = useTranslations("Common");
    const locale = useLocale();
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

    const handleAccountChange = (val: string) => {
        router.push(`${pathname}?${createQueryString({ accountId: val === "all" ? null : val })}`);
    };

    const handleVendorChange = (val: string) => {
        router.push(`${pathname}?${createQueryString({ vendor: val === "all" ? null : val })}`);
        setOpenVendor(false);
    };

    const handleCreatedByChange = (val: string) => {
        router.push(`${pathname}?${createQueryString({ createdBy: val === "all" ? null : val })}`);
    };

    const handleDateChange = (range: DateRange | undefined) => {
        setDate(range);
        if (range?.from && range?.to) {
            router.push(
                `${pathname}?${createQueryString({
                    startDate: format(range.from, "yyyy-MM-dd"),
                    endDate: format(range.to, "yyyy-MM-dd"),
                    month: null,
                })}`
            );
        } else if (!range) {
            router.push(
                `${pathname}?${createQueryString({
                    startDate: null,
                    endDate: null,
                })}`
            );
        }
    };

    const clearFilters = () => {
        setDate(undefined);
        router.push(pathname);
    };

    return (
        <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/20 border rounded-lg">
            <div className="space-y-1.5 min-w-[140px]">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{t("account")}</Label>
                <Select value={accountId} onValueChange={handleAccountChange}>
                    <SelectTrigger className="h-8 text-xs font-medium bg-background">
                        <SelectValue placeholder={t("allAccounts")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("allAccounts")}</SelectItem>
                        {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                                {acc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5 min-w-[160px]">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{t("vendor")}</Label>
                <Popover open={openVendor} onOpenChange={setOpenVendor}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openVendor}
                            className="h-8 w-full justify-between text-xs font-medium bg-background px-3"
                        >
                            {vendorParam || t("allVendors")}
                            <ChevronsUpDown className="ms-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandInput placeholder={t("searchVendors")} className="h-8 text-xs" />
                            <CommandList>
                                <CommandEmpty className="text-xs p-2">{common("notFound")}</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all"
                                        onSelect={() => handleVendorChange("all")}
                                        className="text-xs"
                                    >
                                        <Check
                                            className={cn(
                                                "me-2 h-3 w-3",
                                                !vendorParam ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {t("allVendors")}
                                    </CommandItem>
                                    {vendors.map((v) => (
                                        <CommandItem
                                            key={v}
                                            value={v}
                                            onSelect={() => handleVendorChange(v)}
                                            className="text-xs"
                                        >
                                            <Check
                                                className={cn(
                                                    "me-2 h-3 w-3",
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

            <div className="space-y-1.5 min-w-[140px]">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{t("createdBy")}</Label>
                <Select value={createdByParam || "all"} onValueChange={handleCreatedByChange}>
                    <SelectTrigger className="h-8 text-xs font-medium bg-background">
                        <SelectValue placeholder={t("allMembers")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("allMembers")}</SelectItem>
                        {members.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                                {m.first_name} {m.last_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5 min-w-[220px]">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{t("dateRange")}</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "h-8 justify-start text-start font-medium text-xs bg-background w-full",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="me-2 h-3 w-3" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd", { locale: undefined })} -{" "}
                                        {format(date.to, "LLL dd", { locale: undefined })}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd")
                                )
                            ) : (
                                <span>{t("pickDate")}</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateChange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="pb-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
