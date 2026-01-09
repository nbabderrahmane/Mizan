"use client";

import { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MagicDraftButton({ onClick }: { onClick: () => void }) {
    const [supported, setSupported] = useState(false);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        // Check Feature Flag
        const flag = process.env.NEXT_PUBLIC_ENABLE_LOCAL_AI === "true";
        setEnabled(flag);

        // Check WebGPU
        if (flag && navigator.gpu) {
            setSupported(true);
        }
    }, []);

    if (!enabled) return null;

    if (!supported) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" disabled className="opacity-50">
                            <Wand2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Not supported on this device (WebGPU required)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="secondary"
                        size="sm" // Small button to fit in dialog header
                        onClick={onClick}
                        className="gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-800/50"
                    >
                        <Wand2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Magic Draft</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Draft with Local AI</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
