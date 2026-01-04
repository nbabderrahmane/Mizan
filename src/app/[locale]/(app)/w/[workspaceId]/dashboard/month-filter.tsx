"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";

export function MonthFilter() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get current date from URL or default to now
    const currentMonthStr = searchParams.get("month");
    const date = currentMonthStr ? new Date(currentMonthStr + "-01") : new Date();

    const changeMonth = (delta: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + delta);

        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, "0");
        const newMonthStr = `${year}-${month}`;

        const params = new URLSearchParams(searchParams);
        params.set("month", newMonthStr);

        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[150px] text-center font-medium">
                {date.toLocaleDateString(locale, { month: "long", year: "numeric" })}
            </div>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
