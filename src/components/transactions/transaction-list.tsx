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
import { useLocale, useTranslations } from "next-intl";

interface TransactionListProps {
    workspaceId: string;
    transactions: Transaction[];
    members?: MemberProfile[];
    onEdit?: (transaction: Transaction) => void;
}

export function TransactionList({ workspaceId, transactions, members = [], onEdit }: TransactionListProps) {
    const t = useTranslations("Transactions");
    const common = useTranslations("Common");
    const locale = useLocale();
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
            toast.success(t("deleted"));
        } else {
            toast.error(result.error?.message || common("error"));
        }
    }

    if (!transactions.length) {
        return (
            <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <p>{t("noTransactionsPeriod")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground font-medium">
                        <tr className="border-b">
                            <th className="h-10 px-4 text-start font-medium w-[120px]">{t("date")}</th>
                            <th className="h-10 px-4 text-start font-medium">{t("details")}</th>
                            <th className="h-10 px-4 text-start font-medium w-[140px]">{t("vendor")}</th>
                            <th className="h-10 px-4 text-start font-medium">{t("account")}</th>
                            <th className="h-10 px-4 text-start font-medium w-[140px]">{t("createdBy")}</th>
                            <th className="h-10 px-4 text-end font-medium">{t("amount")}</th>
                            <th className="h-10 px-4 text-end font-medium w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {transactions.map((tItem) => {
                            const isExpense = tItem.base_amount < 0 && tItem.type !== 'transfer';
                            const isIncome = tItem.base_amount > 0 && tItem.type !== 'transfer';

                            // Format amount
                            const amountFormatted = new Intl.NumberFormat(locale, {
                                style: 'currency',
                                currency: tItem.original_currency,
                            }).format(Math.abs(tItem.original_amount));

                            // Find creator
                            const creator = members.find(m => m.user_id === tItem.created_by);
                            const creatorName = creator
                                ? `${creator.first_name || ""} ${creator.last_name || ""}`.trim() || common("unknown")
                                : common("unknown");

                            const isLocked = !!tItem.account?.last_reconciled_at && new Date(tItem.date) <= new Date(tItem.account.last_reconciled_at);

                            return (
                                <tr key={tItem.id} className={cn(
                                    "hover:bg-muted/30 transition-colors group",
                                    isLocked && "opacity-80"
                                )}>
                                    <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                                        {new Date(tItem.date).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-center gap-2">
                                            {tItem.type === 'expense' && <div className="w-2 h-2 rounded-full bg-rose-500" />}
                                            {tItem.type === 'income' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                            {tItem.type === 'transfer' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                            <span className="font-medium">{tItem.title || tItem.category?.name}</span>
                                            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                        </div>
                                        {tItem.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                {tItem.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border">
                                                {tItem.category?.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        {tItem.vendor ? (
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Store className="h-3 w-3" />
                                                <span className="truncate max-w-[120px]">{tItem.vendor}</span>
                                            </div>
                                        ) : "-"}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <span className="truncate max-w-[100px]">{tItem.account?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span className="truncate max-w-[120px]">{creatorName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-end">
                                        <div className={cn(
                                            "font-bold font-mono",
                                            isExpense && "text-rose-600 dark:text-rose-400",
                                            isIncome && "text-emerald-600 dark:text-emerald-400",
                                            tItem.type === 'transfer' && "text-blue-600 dark:text-blue-400"
                                        )}>
                                            {isExpense ? "-" : isIncome ? "+" : ""}{amountFormatted}
                                        </div>
                                        {tItem.original_currency !== tItem.account?.base_currency && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                ≈ {new Intl.NumberFormat(locale, { style: 'currency', currency: tItem.account?.base_currency || 'USD' }).format(Math.abs(tItem.base_amount))}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top text-end">
                                        {!isLocked && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onEdit?.(tItem)}>
                                                        {common("edit")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive font-medium"
                                                        onClick={() => setTransactionToDelete(tItem.id)}
                                                    >
                                                        {common("delete")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
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
                        <DialogTitle>{common("delete")}</DialogTitle>
                        <DialogDescription>
                            {t("deleteConfirm")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransactionToDelete(null)}>
                            {common("cancel")}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? common("deleting") : common("delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
