"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceChart } from "@/app/(app)/w/[workspaceId]/dashboard/balance-chart";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { EditTransactionSheet } from "@/components/transactions/edit-transaction-sheet";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import type { AccountWithBalance } from "@/lib/actions/account";
import type { Transaction } from "@/lib/actions/transaction";
import type { MemberProfile } from "@/lib/actions/workspace";
import type { CategoryWithSubcategories } from "@/lib/actions/category";

interface AccountDetailClientProps {
    workspaceId: string;
    account: AccountWithBalance;
    transactions: Transaction[];
    members: MemberProfile[];
    categories: CategoryWithSubcategories[];
    accounts: AccountWithBalance[];
}

export function AccountDetailClient({
    workspaceId,
    account,
    transactions,
    members,
    categories,
    accounts,
}: AccountDetailClientProps) {
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

    // Calculate totals
    const totalIncome = transactions
        .filter(t => t.type === "income" || (t.type === "transfer" && t.base_amount > 0))
        .reduce((sum, t) => sum + Math.abs(t.base_amount), 0);

    const totalExpenses = transactions
        .filter(t => t.type === "expense" || (t.type === "transfer" && t.base_amount < 0))
        .reduce((sum, t) => sum + Math.abs(t.base_amount), 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: account.base_currency,
        }).format(amount);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/w/${workspaceId}/accounts`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{account.name}</h1>
                        <p className="text-muted-foreground">
                            {account.type} • {account.base_currency}
                        </p>
                    </div>
                </div>
                <CreateTransactionDialog
                    workspaceId={workspaceId}
                    accounts={accounts}
                    categories={categories}
                />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Balance Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Balance History</CardTitle>
                </CardHeader>
                <CardContent>
                    <BalanceChart workspaceId={workspaceId} currency={account.base_currency} accountId={account.id} />
                </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <TransactionFilters
                        accounts={[]} // Empty because we're already filtering by this account
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
