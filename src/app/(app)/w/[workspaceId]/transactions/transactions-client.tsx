"use client";

import { useState } from "react";
import { TransactionList } from "@/components/transactions/transaction-list";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { EditTransactionSheet } from "@/components/transactions/edit-transaction-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Transaction } from "@/lib/actions/transaction";
import { AccountWithBalance } from "@/lib/actions/account";
import { CategoryWithSubcategories } from "@/lib/actions/category";
import { MemberProfile } from "@/lib/actions/workspace";

interface TransactionsPageClientProps {
    workspaceId: string;
    transactions: Transaction[];
    accounts: AccountWithBalance[];
    categories: CategoryWithSubcategories[];
    initialVendors: string[];
    members: MemberProfile[];
}

export function TransactionsPageClient({
    workspaceId,
    transactions,
    accounts,
    categories,
    initialVendors,
    members,
}: TransactionsPageClientProps) {
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Transactions</h1>
                    <p className="text-muted-foreground">
                        Manage your income, expenses, and transfers.
                    </p>
                </div>
                <CreateTransactionDialog
                    workspaceId={workspaceId}
                    accounts={accounts}
                    categories={categories}
                />
            </div>

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
