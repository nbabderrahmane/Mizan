"use strict";
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface PaginationControlsProps {
    total: number;
    limit: number;
}

export function PaginationControls({ total, limit }: PaginationControlsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const page = Number(searchParams.get("page")) || 1;
    const totalPages = Math.ceil(total / limit);

    function goToPage(newPage: number) {
        if (newPage < 1 || newPage > totalPages) return;

        const params = new URLSearchParams(searchParams);
        params.set("page", newPage.toString());
        router.push(`?${params.toString()}`);
    }

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} items)
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
