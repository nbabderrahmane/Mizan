"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface QuickStartProps {
    workspaceId: string;
    stats: {
        hasAccounts: boolean;
        hasCategories: boolean;
        hasBudgets: boolean;
        hasTransactions: boolean;
    };
}

export function QuickStart({ workspaceId, stats }: QuickStartProps) {
    const t = useTranslations("Dashboard");
    const [isVisible, setIsVisible] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const dismissed = localStorage.getItem(`mizan-quickstart-dismissed-${workspaceId}`);
        if (dismissed === "true") {
            setIsVisible(false);
        }
    }, [workspaceId]);

    function handleDismiss() {
        setIsVisible(false);
        localStorage.setItem(`mizan-quickstart-dismissed-${workspaceId}`, "true");
    }

    // Determine if all steps are complete
    const allComplete =
        stats.hasAccounts &&
        stats.hasCategories &&
        stats.hasBudgets &&
        stats.hasTransactions;

    // Don't render server-side mismatch, wait for mount to check local storage
    if (!isMounted) return null;

    // Logic: If all complete, hide. If user dismissed, hide.
    if (allComplete || !isVisible) return null;

    const steps = [
        {
            label: t("addAccounts"),
            done: stats.hasAccounts,
        },
        {
            label: t("setupCategories"),
            done: stats.hasCategories,
        },
        {
            label: t("createBudget"),
            done: stats.hasBudgets,
        },
        {
            label: t("startRecording"),
            done: stats.hasTransactions,
        },
    ];

    return (
        <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{t("quickStart")}</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleDismiss}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t("dismiss")}</span>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex items-start gap-3 text-sm",
                                step.done ? "text-muted-foreground line-through" : "text-foreground"
                            )}
                        >
                            {step.done ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            ) : (
                                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                            <span className="mt-0.5">{step.label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
