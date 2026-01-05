"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Landmark,
    Wallet,
    PiggyBank,
    TrendingUp,
    MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Account, AccountWithBalance } from "@/lib/actions/account";
import { useLocale, useTranslations } from "next-intl";

const accountTypeConfig = {
    bank: {
        icon: Landmark,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    cash: {
        icon: Wallet,
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-100 dark:bg-green-900/30",
    },
    savings: {
        icon: PiggyBank,
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    investment: {
        icon: TrendingUp,
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-100 dark:bg-orange-900/30",
    },
};

interface AccountCardProps {
    account: AccountWithBalance;
    onEdit?: (account: Account) => void;
    onReconcile?: (account: Account) => void;
    onArchive?: (accountId: string) => void;
    workspaceId: string;
}

export function AccountCard({ account, onEdit, onReconcile, onArchive, workspaceId }: AccountCardProps) {
    const t = useTranslations("Accounts");
    const common = useTranslations("Common");
    const locale = useLocale();
    const config = (accountTypeConfig as any)[account.type] || accountTypeConfig.bank;
    const Icon = config.icon;
    const pathname = usePathname();

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <Link href={`/w/${workspaceId}/accounts/${account.id}`} className="block">
            <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", config.bg)}>
                            <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <div>
                            <h3 className="font-medium">{account.name}</h3>
                            <p className="text-xs text-muted-foreground capitalize">
                                {t(account.type as any) || account.type} • {account.base_currency}
                            </p>
                        </div>
                    </div>

                    <div onClick={(e) => e.preventDefault()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit?.(account)}>
                                    {common("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onReconcile?.(account)}>
                                    {t("reconcile")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onArchive?.(account.id)}
                                    className="text-destructive"
                                >
                                    {common("archive")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">{t("balance")}</span>
                        <span className="text-lg font-semibold">
                            {formatCurrency(
                                account.available ?? account.opening_balance ?? 0,
                                account.base_currency
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

interface AccountListProps {
    accounts: AccountWithBalance[];
    onEdit?: (account: Account) => void;
    onReconcile?: (account: Account) => void;
    onArchive?: (accountId: string) => void;
    workspaceId: string;
}

export function AccountList({ accounts, onEdit, onReconcile, onArchive, workspaceId }: AccountListProps) {
    const t = useTranslations("Accounts");

    if (!accounts.length) {
        return (
            <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <p>{t("noAccounts")}</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
                <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={onEdit}
                    onReconcile={onReconcile}
                    onArchive={onArchive}
                    workspaceId={workspaceId}
                />
            ))}
        </div>
    );
}
