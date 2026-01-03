"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seedDefaultCategories } from "@/lib/actions/category";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";

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
    const [isSeeding, setIsSeeding] = useState(false);
    const [seeded, setSeeded] = useState(hasCategories);
    const [accountsCreated, setAccountsCreated] = useState(hasAccounts);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

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

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Quick Setup</h1>
                <p className="text-muted-foreground mt-2">
                    Get started with your budget in a few clicks
                </p>
            </div>

            <div className="space-y-4">
                {/* Step 1: Accounts */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            {accountsCreated ? (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : (
                                <div className="h-6 w-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-sm font-medium">
                                    1
                                </div>
                            )}
                            <div>
                                <CardTitle className="text-lg">Add Accounts</CardTitle>
                                <CardDescription>
                                    Set up your bank accounts, cash, and savings
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            onClick={() => setIsAccountDialogOpen(true)}
                            className={accountsCreated ? "w-full sm:w-auto" : "w-full"}
                            variant={accountsCreated ? "outline" : "default"}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {accountsCreated ? "Add Another Account" : "Add Your First Account"}
                        </Button>

                        {accountsCreated && (
                            <Button
                                variant="ghost"
                                onClick={() => router.push(`/w/${workspaceId}/accounts`)}
                                className="w-full sm:w-auto sm:ml-2"
                            >
                                Manage Accounts
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Step 2: Categories */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            {seeded ? (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : (
                                <div className="h-6 w-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-sm font-medium">
                                    2
                                </div>
                            )}
                            <div>
                                <CardTitle className="text-lg">Set Up Categories</CardTitle>
                                <CardDescription>
                                    Organize your budget with categories
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!seeded && (
                            <Button
                                onClick={handleSeedCategories}
                                disabled={isSeeding}
                            >
                                {isSeeding ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Use Default Categories
                                    </>
                                )}
                            </Button>
                        )}
                        <Button
                            variant={seeded ? "default" : "outline"}
                            onClick={() => router.push(`/w/${workspaceId}/categories`)}
                        >
                            {seeded ? "Customize Categories" : "Create Custom Categories"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Done */}
                {accountsCreated && seeded && (
                    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-3">
                                <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                                <h3 className="font-semibold text-lg">You&apos;re all set!</h3>
                                <p className="text-muted-foreground">
                                    Start adding transactions to track your budget.
                                </p>
                                <Button
                                    onClick={() => router.push(`/w/${workspaceId}/dashboard`)}
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
