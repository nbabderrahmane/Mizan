"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PiggyBank, CreditCard, ArrowRight, Loader2, Plus } from "lucide-react";
import { applyMonthlyContributions } from "@/lib/actions/budget";
import { useToast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";

interface DashboardInteractivesProps {
    workspaceId: string;
    currency: string;
    dueAmount: number;
    pendingPayments: any[];
    accounts: any[];
}

export function DashboardInteractives({ workspaceId, currency, dueAmount, pendingPayments, accounts }: DashboardInteractivesProps) {
    const t = useTranslations("Dashboard");
    const common = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const [isApplying, setIsApplying] = useState(false);
    const { toast } = useToast();

    async function handleApply() {
        setIsApplying(true);
        const res = await applyMonthlyContributions(workspaceId);
        setIsApplying(false);

        if (res.success) {
            toast({
                title: t("fundingApplied"),
                description: t("fundingAppliedDesc"),
            });
        } else {
            toast({
                title: t("fundingFailed"),
                description: res.error?.message || common("error"),
                variant: "destructive",
            });
        }
    }

    function handleConfirmPayment(paymentId: string) {
        // Navigate to transactions page with payment ID to pre-fill the form
        router.push(`/w/${workspaceId}/transactions?paymentId=${paymentId}`);
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Set Aside Card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-primary" />
                        {t("monthlyFunding")}
                    </CardTitle>
                    <CardDescription>{t("monthlyFundingDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="text-3xl font-bold">
                        {formatCurrency(dueAmount)}
                    </div>
                    <Button onClick={handleApply} disabled={isApplying || dueAmount <= 0}>
                        {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                        {t("apply")}
                    </Button>
                </CardContent>
            </Card>

            {/* Payments Due Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-amber-500" />
                        {t("paymentsDue")}
                    </CardTitle>
                    <CardDescription>{t("paymentsDueDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {pendingPayments.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-2">{t("noPaymentsDue")}</p>
                    ) : (
                        pendingPayments.map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-transparent hover:border-muted-foreground/20 transition-colors">
                                <div>
                                    <p className="text-sm font-medium">{payment.budget.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{payment.due_date}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold">
                                        {new Intl.NumberFormat(locale, {
                                            style: 'currency',
                                            currency: payment.budget?.currency || currency || 'USD'
                                        }).format(payment.amount_expected)}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs"
                                        onClick={() => handleConfirmPayment(payment.id)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {t("pay")}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
