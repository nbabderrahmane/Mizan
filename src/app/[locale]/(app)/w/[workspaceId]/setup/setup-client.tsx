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
    workspaceType: string;
}

export function SetupPageClient({
    workspaceId,
    hasCategories,
    hasAccounts,
    workspaceType,
}: SetupPageClientProps) {
    const router = useRouter();
    const t = useTranslations("Setup");
    const onboarding = useTranslations("Onboarding");

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
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    {t("description")}
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
                                    <CardTitle>{t("addAccounts")}</CardTitle>
                                    <CardDescription>
                                        {t("addAccountsDesc")}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!accountsCreated ? (
                                <Button onClick={() => setIsAccountDialogOpen(true)} className="w-full sm:w-auto">
                                    <Plus className="mr-2 h-4 w-4" /> {t("addFirstAccount")}
                                </Button>
                            ) : (
                                <div className="flex items-center text-sm text-green-600 font-medium">
                                    <CheckCircle className="mr-2 h-4 w-4" /> {t("accountAdded")}
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
                                    <CardTitle>{t("setUpCategories")}</CardTitle>
                                    <CardDescription>
                                        {t("setUpCategoriesDesc")}
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
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("setUpCategoriesDesc")}</>
                                        ) : (
                                            <><Sparkles className="mr-2 h-4 w-4" /> {t("useRecommended")}</>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => router.push(`/w/${workspaceId}/categories`)}
                                        disabled={!accountsCreated || isSeeding}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        {onboarding("setupManually")}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center text-sm text-green-600 font-medium">
                                    <CheckCircle className="mr-2 h-4 w-4" /> {t("categoriesReady")}
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
                                    <h3 className="font-bold text-2xl">{t("allSet")}</h3>
                                    <p className="text-muted-foreground">
                                        {t("allSetDesc")}
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={() => router.push(`/w/${workspaceId}/dashboard`)}
                                    className="w-full sm:w-auto min-w-[200px]"
                                >
                                    {t("goToDashboard")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <CreateAccountDialog
                workspaceId={workspaceId}
                workspaceType={workspaceType}
                open={isAccountDialogOpen}
                onOpenChange={setIsAccountDialogOpen}
                onSuccess={handleAccountCreated}
            />
        </div>
    );
}
