"use strict";
"use client";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
// import { useDebounce } from "@/hooks/use-debounce"; 
// Actually, to be safe and avoid missing dependencies, I'll just use simple timeout or local state and effect.

import { Search } from "lucide-react";

export function WorkspaceToolbar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const initialSearch = searchParams.get("search") || "";
    const initialStatus = searchParams.get("status") || "all";

    const [search, setSearch] = useState(initialSearch);

    // Simple debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== initialSearch) {
                updateParams({ search });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search, initialSearch]);

    function updateParams(updates: { search?: string; status?: string }) {
        const params = new URLSearchParams(searchParams);

        if (updates.search !== undefined) {
            if (updates.search) params.set("search", updates.search);
            else params.delete("search");
        }

        if (updates.status !== undefined) {
            if (updates.status && updates.status !== "all") params.set("status", updates.status);
            else params.delete("status");
        }

        // Reset page on filter change
        params.delete("page");

        startTransition(() => {
            router.push(`/admin/workspaces?${params.toString()}`);
        });
    }

    return (
        <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search workspaces..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="w-[180px]">
                <Select
                    defaultValue={initialStatus}
                    onValueChange={(val) => updateParams({ status: val })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
