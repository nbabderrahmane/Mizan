"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PiggyBank, CreditCard, ArrowRight, Loader2, Check } from "lucide-react";
import { applyMonthlyContributions, confirmPayment } from "@/lib/actions/budget";
import { useToast } from "@/hooks/use-toast";

interface DashboardInteractivesProps {
    workspaceId: string;
    currency: string;
    dueAmount: number;
    pendingPayments: any[];
    accounts: any[];
}

export function DashboardInteractives({ workspaceId, currency, dueAmount, pendingPayments, accounts }: DashboardInteractivesProps) {
    const [isApplying, setIsApplying] = useState(false);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const { toast } = useToast();

    async function handleApply() {
        setIsApplying(true);
        const res = await applyMonthlyContributions(workspaceId);
        setIsApplying(false);

        if (res.success) {
            toast({
                title: "Funding Applied",
                description: "All monthly contributions have been set aside.",
            });
        } else {
            toast({
                title: "Funding Failed",
                description: res.error?.message || "Something went wrong",
                variant: "destructive",
            });
        }
    }

    async function handleConfirm(paymentId: string) {
        if (accounts.length === 0) {
            toast({
                title: "No Account",
                description: "User must have at least one account to confirm payment.",
                variant: "destructive",
            });
            return;
        }

        setConfirmingId(paymentId);
        const res = await confirmPayment(workspaceId, paymentId, accounts[0].id);
        setConfirmingId(null);

        if (res.success) {
            toast({
                title: "Payment Confirmed",
                description: "The payment has been recorded as a transaction.",
            });
        } else {
            toast({
                title: "Confirmation Failed",
                description: res.error?.message || "Something went wrong",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Set Aside Card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-primary" />
                        Monthly Funding
                    </CardTitle>
                    <CardDescription>Total amount to set aside for your plans.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="text-3xl font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(dueAmount)}
                    </div>
                    <Button onClick={handleApply} disabled={isApplying || dueAmount <= 0}>
                        {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                        Apply
                    </Button>
                </CardContent>
            </Card>

            {/* Payments Due Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-amber-500" />
                        Payments Due
                    </CardTitle>
                    <CardDescription>Real-world payments to confirm.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {pendingPayments.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-2">No payments due right now.</p>
                    ) : (
                        pendingPayments.map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-transparent hover:border-muted-foreground/20 transition-colors">
                                <div>
                                    <p className="text-sm font-medium">{payment.budget.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{payment.due_date}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold">
                                        {new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: payment.budget?.currency || currency || 'USD'
                                        }).format(payment.amount_expected)}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs"
                                        onClick={() => handleConfirm(payment.id)}
                                        disabled={confirmingId === payment.id}
                                    >
                                        {confirmingId === payment.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                        Confirm
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
