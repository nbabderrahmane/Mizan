"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Sparkles, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seedDefaultCategories } from "@/lib/actions/category";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { TopBudgets } from "./top-budgets";
import { useTranslations } from "next-intl";

interface SetupPageClientProps {
    workspaceId: string;
    hasCategories: boolean;
    hasAccounts: boolean;
}

export function SetupPageClient({
    workspaceId,
    hasCategories,
    hasAccounts,
}: SetupPageClientProps) {
    const router = useRouter();
    const t = useTranslations("Onboarding"); // Assuming keys are here mostly
    // For manual button, I added "setupManually" to "Onboarding" in messages/en.json via replace earlier?
    // Wait, I added it to "Onboarding"? 
    // replacing: "createYourWorkspace": "Create your workspace"
    //           "setupManually": "Setup Manually"
    // Yes, that was in Onboarding section (lines 34-46 in original view).

    const [isSeeding, setIsSeeding] = useState(false);
    const [seeded, setSeeded] = useState(hasCategories);
    const [accountsCreated, setAccountsCreated] = useState(hasAccounts);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const [topBudgetsDone, setTopBudgetsDone] = useState(false);

    async function handleSeedCategories() {
        setIsSeeding(true);
        const result = await seedDefaultCategories(workspaceId);
        setIsSeeding(false);
        if (result.success) {
            setSeeded(true);
            router.refresh();
        }
    }

    function handleAccountCreated() {
        setAccountsCreated(true);
        setIsAccountDialogOpen(false);
        router.refresh();
    }

    function handleTopBudgetsComplete() {
        setTopBudgetsDone(true);
    }

    // If everything is done, show the success state
    const allDone = accountsCreated && seeded && topBudgetsDone;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Quick Setup</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Let&apos;s get your workspace ready in 3 simple steps.
                </p>
            </div>

            <div className="space-y-6">
                {/* Step 1: Accounts */}
                {!allDone && (
                    <Card className={accountsCreated ? "opacity-60 hover:opacity-100 transition-opacity" : ""}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-4">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${accountsCreated ? "bg-green-600" : "bg-primary"}`}>
                                    {accountsCreated ? <CheckCircle className="h-5 w-5" /> : "1"}
                                </div>
                                <div>
                                    <CardTitle>Add Accounts</CardTitle>
                                    <CardDescription>
                                        Connect your bank, cash, or savings accounts.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!accountsCreated ? (
                                <Button onClick={() => setIsAccountDialogOpen(true)} className="w-full sm:w-auto">
                                    <Plus className="mr-2 h-4 w-4" /> Add First Account
                                </Button>
                            ) : (
                                <div className="flex items-center text-sm text-green-600 font-medium">
                                    <CheckCircle className="mr-2 h-4 w-4" /> Account Added
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Categories */}
                {!allDone && (
                    <Card className={seeded ? "opacity-60 hover:opacity-100 transition-opacity" : ""}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-4">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${seeded ? "bg-green-600" : accountsCreated ? "bg-primary" : "bg-muted"}`}>
                                    {seeded ? <CheckCircle className="h-5 w-5" /> : "2"}
                                </div>
                                <div>
                                    <CardTitle>Set Up Categories</CardTitle>
                                    <CardDescription>
                                        Create the structure for your spending.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!seeded ? (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        onClick={handleSeedCategories}
                                        disabled={!accountsCreated || isSeeding}
                                        variant={accountsCreated ? "default" : "secondary"}
                                        className="w-full sm:w-auto"
                                    >
                                        {isSeeding ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
                                        ) : (
                                            <><Sparkles className="mr-2 h-4 w-4" /> Use Recommended Categories</>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => router.push(`/w/${workspaceId}/categories`)}
                                        disabled={!accountsCreated || isSeeding}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        {t("setupManually")}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center text-sm text-green-600 font-medium">
                                    <CheckCircle className="mr-2 h-4 w-4" /> Categories Ready
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Top 10 Budgets (The new UI) */}
                {seeded && !topBudgetsDone && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <TopBudgets workspaceId={workspaceId} onComplete={handleTopBudgetsComplete} />
                    </div>
                )}

                {/* Done State */}
                {allDone && (
                    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <div className="h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-2xl">You&apos;re all set!</h3>
                                    <p className="text-muted-foreground">
                                        Your workspace is ready. Let&apos;s go to the dashboard.
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={() => router.push(`/w/${workspaceId}/dashboard`)}
                                    className="w-full sm:w-auto min-w-[200px]"
                                >
                                    Go to Dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <CreateAccountDialog
                workspaceId={workspaceId}
                open={isAccountDialogOpen}
                onOpenChange={setIsAccountDialogOpen}
                onSuccess={handleAccountCreated}
            />
        </div>
    );
}
