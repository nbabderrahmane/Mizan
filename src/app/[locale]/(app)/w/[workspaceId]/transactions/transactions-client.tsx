"use client";

import { useState, useEffect } from "react";
import { TransactionList } from "@/components/transactions/transaction-list";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { EditTransactionSheet } from "@/components/transactions/edit-transaction-sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus } from "lucide-react";
import { Transaction } from "@/lib/actions/transaction";
import { Account } from "@/lib/actions/account";
import { CategoryWithSubcategories } from "@/lib/actions/category";
import { MemberProfile } from "@/lib/actions/workspace";
import { BudgetWithConfigs } from "@/lib/validations/budget";
import { useLocale, useTranslations } from "next-intl";

interface PendingPayment {
    id: string;
    name: string;
    subcategory_id: string;
    due_date: string;
    amount: number;
    currency: string;
}

interface TransactionsPageClientProps {
    workspaceId: string;
    transactions: Transaction[];
    accounts: Account[];
    categories: CategoryWithSubcategories[];
    initialVendors: string[];
    members: MemberProfile[];
    workspaceCurrency?: string;
    budgets?: BudgetWithConfigs[];
    pendingPayments?: PendingPayment[];
    initialPaymentId?: string;
}

export function TransactionsPageClient({
    workspaceId,
    transactions,
    accounts,
    categories,
    initialVendors,
    members,
    workspaceCurrency = "USD",
    budgets = [],
    pendingPayments = [],
    initialPaymentId,
}: TransactionsPageClientProps) {
    const t = useTranslations("Transactions");
    const d = useTranslations("Dashboard");
    const locale = useLocale();
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [prefilledPayment, setPrefilledPayment] = useState<PendingPayment | null>(null);

    // Auto-prefill dialog when navigating with paymentId from Dashboard
    useEffect(() => {
        if (initialPaymentId && pendingPayments.length > 0) {
            const payment = pendingPayments.find(p => p.id === initialPaymentId);
            if (payment) {
                setPrefilledPayment(payment);
            }
        }
    }, [initialPaymentId, pendingPayments]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("description")}
                    </p>
                </div>
                <CreateTransactionDialog
                    workspaceId={workspaceId}
                    accounts={accounts}
                    categories={categories}
                    workspaceCurrency={workspaceCurrency}
                    budgets={budgets}
                    prefilled={prefilledPayment}
                    onClose={() => setPrefilledPayment(null)}
                />
            </div>

            {/* Pending Payments Section */}
            {pendingPayments.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-amber-500" />
                            {t("paymentsDue")}
                        </CardTitle>
                        <CardDescription>{t("paymentsDueDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {pendingPayments.map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-white border">
                                <div>
                                    <p className="font-medium">{payment.name}</p>
                                    <p className="text-xs text-muted-foreground">{t("due")}: {payment.due_date}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">
                                        {new Intl.NumberFormat(locale, { style: 'currency', currency: payment.currency }).format(payment.amount)}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPrefilledPayment(payment)}
                                    >
                                        <Plus className="h-4 w-4 me-1" />
                                        {t("createTransaction")}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-4 space-y-4">
                    <TransactionFilters
                        accounts={accounts}
                        vendors={initialVendors}
                        members={members}
                    />
                    <TransactionList
                        workspaceId={workspaceId}
                        transactions={transactions}
                        members={members}
                        onEdit={setTransactionToEdit}
                    />
                </CardContent>
            </Card>

            {transactionToEdit && (
                <EditTransactionSheet
                    transaction={transactionToEdit}
                    workspaceId={workspaceId}
                    accounts={accounts}
                    categories={categories}
                    open={!!transactionToEdit}
                    onOpenChange={(open) => !open && setTransactionToEdit(null)}
                />
            )}
        </div>
    );
}
