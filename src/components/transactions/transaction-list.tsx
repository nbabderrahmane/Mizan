"use client";

import { toast } from "sonner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRightLeft,
    Trash2,
    MoreHorizontal,
    Lock,
    User,
    Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTransaction, Transaction } from "@/lib/actions/transaction";
import { MemberProfile } from "@/lib/actions/workspace";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface TransactionListProps {
    workspaceId: string;
    transactions: Transaction[];
    members?: MemberProfile[]; // Optional to avoid breaking if not passed immediately, but we will pass it.
    onEdit?: (transaction: Transaction) => void;
}

export function TransactionList({ workspaceId, transactions, members = [], onEdit }: TransactionListProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    async function handleDelete() {
        if (!transactionToDelete) return;
        setIsDeleting(true);
        const result = await deleteTransaction(transactionToDelete);
        setIsDeleting(false);
        setTransactionToDelete(null);
        if (result.success) {
            router.refresh();
            toast.success("Transaction deleted");
        } else {
            toast.error(result.error?.message || "Failed to delete transaction");
        }
    }

    if (!transactions.length) {
        return (
            <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <p>No transactions found for this period.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground font-medium">
                        <tr className="border-b">
                            <th className="h-10 px-4 text-left font-medium w-[120px]">Date</th>
                            <th className="h-10 px-4 text-left font-medium">Details</th>
                            <th className="h-10 px-4 text-left font-medium w-[140px]">Vendor</th>
                            <th className="h-10 px-4 text-left font-medium">Account</th>
                            <th className="h-10 px-4 text-left font-medium w-[140px]">Created By</th>
                            <th className="h-10 px-4 text-right font-medium">Amount</th>
                            <th className="h-10 px-4 text-right font-medium w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {transactions.map((t) => {
                            const isExpense = t.base_amount < 0 && t.type !== 'transfer';
                            const isIncome = t.base_amount > 0 && t.type !== 'transfer';

                            // Format amount
                            const amountFormatted = new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: t.original_currency,
                            }).format(Math.abs(t.original_amount));

                            // Find creator
                            const creator = members.find(m => m.user_id === t.created_by);
                            const creatorName = creator
                                ? `${creator.first_name || ""} ${creator.last_name || ""}`.trim() || "Unknown"
                                : "Unknown";

                            // Locking Logic
                            const isLocked = (() => {
                                if (!t.account?.last_reconciled_at) return false;
                                const frozenTime = new Date(t.account.last_reconciled_at);
                                const frozenDateStr = frozenTime.toISOString().slice(0, 10);
                                const txDateStr = t.date;

                                // Strictly in the past
                                if (txDateStr < frozenDateStr) return true;

                                // Same day check - if created_at is available and <= frozenTime
                                if (txDateStr === frozenDateStr) {
                                    if (t.created_at) {
                                        const txCreated = new Date(t.created_at);
                                        return txCreated <= frozenTime;
                                    }
                                    return false;
                                }

                                return false;
                            })();

                            return (
                                <tr
                                    key={t.id}
                                    className={cn("group transition-colors cursor-pointer",
                                        isLocked ? "bg-muted/10 hover:bg-muted/20" : "hover:bg-muted/50"
                                    )}
                                    onClick={() => {
                                        if (isLocked) {
                                            toast.error("This transaction is locked by a reconciliation.");
                                        } else {
                                            onEdit?.(t);
                                        }
                                    }}
                                >
                                    <td className="p-4 align-top whitespace-nowrap text-muted-foreground">
                                        <div className="flex flex-col">
                                            <span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(t.date))}</span>
                                            {isLocked && (
                                                <span className="text-[10px] inline-flex items-center gap-1 text-amber-600/70 mt-0.5">
                                                    <Lock className="h-3 w-3" /> Locked
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex items-start gap-3">
                                            <div className={cn("mt-0.5 p-1.5 rounded-full shrink-0",
                                                t.type === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                    t.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                            )}>
                                                {t.type === 'expense' ? <ArrowDownLeft className="h-4 w-4" /> :
                                                    t.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> :
                                                        <ArrowRightLeft className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                {/* Header: Title or Description */}
                                                <div className="font-medium text-foreground">
                                                    {t.title || t.description || "No description"}
                                                </div>

                                                {/* Subheader: Description if Title is used */}
                                                {t.title && t.description && (
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {t.description}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {t.category && (
                                                        <div className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                            {t.category.name}
                                                        </div>
                                                    )}
                                                    {t.transfer_account_id && (
                                                        <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                                            → {t.transfer_account?.name || "Transfer"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top text-muted-foreground">
                                        {t.vendor || "—"}
                                    </td>
                                    <td className="p-4 align-top text-muted-foreground">
                                        {t.account?.name}
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground" title={creatorName}>
                                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                                <User className="h-3 w-3 opacity-50" />
                                            </div>
                                            <span className="truncate max-w-[100px]">{creatorName}</span>
                                        </div>
                                    </td>
                                    <td className={cn("p-4 align-top text-right font-mono font-medium whitespace-nowrap",
                                        isExpense ? 'text-red-600 dark:text-red-400' :
                                            isIncome ? 'text-green-600 dark:text-green-400' :
                                                'text-blue-600 dark:text-blue-400'
                                    )}>
                                        {isExpense ? '-' : isIncome ? '+' : ''}{amountFormatted}
                                        {t.original_currency !== t.account?.base_currency && (
                                            <div className="text-xs text-muted-foreground font-sans">
                                                {new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: t.account?.base_currency || 'USD',
                                                }).format(Math.abs(t.base_amount))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-top text-right">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => onEdit?.(t)}
                                                        disabled={!!isLocked}
                                                    >
                                                        {isLocked ? "Edit (Locked)" : "Edit"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setTransactionToDelete(t.id)}
                                                        disabled={!!isLocked}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {isLocked ? "Delete (Locked)" : "Delete"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete this transaction and revert the balance change.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransactionToDelete(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
