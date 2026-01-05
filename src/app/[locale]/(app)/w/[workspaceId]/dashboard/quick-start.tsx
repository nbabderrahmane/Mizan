"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { CreateCategoryDialog } from "@/components/categories/category-dialogs";
import { CreateBudgetWizard } from "@/components/budgets/create-budget-wizard";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";

interface QuickStartProps {
    workspaceId: string;
    stats: {
        hasAccounts: boolean;
        hasCategories: boolean;
        hasBudgets: boolean;
        hasTransactions: boolean;
    };
    accounts: any[];
    categories: any[];
    currency: string;
}

export function QuickStart({ workspaceId, stats, accounts, categories, currency }: QuickStartProps) {
    const t = useTranslations("Dashboard");
    const [isVisible, setIsVisible] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // Dialog states
    const [accountOpen, setAccountOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [budgetOpen, setBudgetOpen] = useState(false);
    const [transactionOpen, setTransactionOpen] = useState(false);

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
            onClick: () => setAccountOpen(true),
        },
        {
            label: t("setupCategories"),
            done: stats.hasCategories,
            onClick: () => setCategoryOpen(true),
        },
        {
            label: t("createBudget"),
            done: stats.hasBudgets,
            onClick: () => setBudgetOpen(true),
        },
        {
            label: t("startRecording"),
            done: stats.hasTransactions,
            onClick: () => setTransactionOpen(true),
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
                        <button
                            key={index}
                            onClick={step.onClick}
                            className={cn(
                                "flex items-start gap-3 text-sm w-full text-left p-2 rounded-md transition-all duration-200 group",
                                step.done
                                    ? "text-muted-foreground line-through opacity-70 hover:bg-muted/30"
                                    : "text-foreground hover:bg-muted hover:translate-x-1"
                            )}
                        >
                            {step.done ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            ) : (
                                <Circle className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                            )}
                            <span className="mt-0.5 font-medium">{step.label}</span>
                        </button>
                    ))}
                </div>

                {/* Dialogs */}
                <CreateAccountDialog
                    workspaceId={workspaceId}
                    open={accountOpen}
                    onOpenChange={setAccountOpen}
                    onSuccess={() => setAccountOpen(false)}
                />

                <CreateCategoryDialog
                    workspaceId={workspaceId}
                    open={categoryOpen}
                    onOpenChange={setCategoryOpen}
                    onSuccess={() => setCategoryOpen(false)}
                />

                <CreateBudgetWizard
                    workspaceId={workspaceId}
                    open={budgetOpen}
                    setOpen={setBudgetOpen}
                    categories={categories}
                    accounts={accounts}
                    workspaceCurrency={currency}
                    onSuccess={() => setBudgetOpen(false)}
                />

                <CreateTransactionDialog
                    workspaceId={workspaceId}
                    accounts={accounts}
                    categories={categories}
                    workspaceCurrency={currency}
                    open={transactionOpen}
                    onOpenChange={setTransactionOpen}
                />
            </CardContent>
        </Card>
    );
}
