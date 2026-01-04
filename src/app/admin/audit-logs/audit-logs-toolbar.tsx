"use strict";
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { Search, Calendar } from "lucide-react";

export function AuditLogsToolbar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const initialAction = searchParams.get("action") || "";
    const initialDateFrom = searchParams.get("dateFrom") || "";
    const initialDateTo = searchParams.get("dateTo") || "";

    const [action, setAction] = useState(initialAction);
    const [dateFrom, setDateFrom] = useState(initialDateFrom);
    const [dateTo, setDateTo] = useState(initialDateTo);

    // Debounce effect for all params
    useEffect(() => {
        const timer = setTimeout(() => {
            if (
                action !== initialAction ||
                dateFrom !== initialDateFrom ||
                dateTo !== initialDateTo
            ) {
                updateParams({ action, dateFrom, dateTo });
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [action, dateFrom, dateTo, initialAction, initialDateFrom, initialDateTo]);

    function updateParams(updates: { action?: string; dateFrom?: string; dateTo?: string }) {
        const params = new URLSearchParams(searchParams);

        if (updates.action !== undefined) {
            if (updates.action) params.set("action", updates.action);
            else params.delete("action");
        }

        if (updates.dateFrom !== undefined) {
            if (updates.dateFrom) params.set("dateFrom", updates.dateFrom);
            else params.delete("dateFrom");
        }

        if (updates.dateTo !== undefined) {
            if (updates.dateTo) params.set("dateTo", updates.dateTo);
            else params.delete("dateTo");
        }

        params.delete("page");

        startTransition(() => {
            router.push(`/admin/audit-logs?${params.toString()}`);
        });
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by action..."
                    className="pl-8"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From</Label>
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="dateFrom"
                            type="date"
                            className="pl-8 w-[160px]"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To</Label>
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="dateTo"
                            type="date"
                            className="pl-8 w-[160px]"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
