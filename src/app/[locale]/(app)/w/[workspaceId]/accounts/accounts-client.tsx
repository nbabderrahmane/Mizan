"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountList } from "@/components/accounts/account-card";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
import { ReconcileAccountDialog } from "@/components/accounts/reconcile-account-dialog";
import type { Account, AccountWithBalance } from "@/lib/actions/account";
import { archiveAccount } from "@/lib/actions/account";
import { useTranslations } from "next-intl";

interface AccountsPageClientProps {
    workspaceId: string;
    accounts: AccountWithBalance[];
    canManage: boolean;
}

export function AccountsPageClient({
    workspaceId,
    accounts,
    canManage,
}: AccountsPageClientProps) {
    const t = useTranslations("Accounts");
    const common = useTranslations("Common");
    const router = useRouter();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
    const [accountToReconcile, setAccountToReconcile] = useState<Account | null>(null);

    // Old handleEdit was redirecting to detail page (not implemented yet).
    // New behavior: Open Edit Dialog.
    function handleEdit(account: Account) {
        setAccountToEdit(account);
    }

    function handleReconcile(account: Account) {
        setAccountToReconcile(account);
    }

    async function handleArchive(accountId: string) {
        if (!confirm(t("archiveConfirm"))) return;
        await archiveAccount(accountId, workspaceId);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("description")}
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="h-4 w-4 me-2" />
                        {t("addAccount")}
                    </Button>
                )}
            </div>

            <AccountList
                accounts={accounts}
                onEdit={canManage ? handleEdit : undefined}
                onReconcile={handleReconcile}
                onArchive={canManage ? handleArchive : undefined}
            />

            {canManage && (
                <CreateAccountDialog
                    workspaceId={workspaceId}
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={() => router.refresh()}
                />
            )}

            {canManage && accountToEdit && (
                <EditAccountDialog
                    workspaceId={workspaceId}
                    account={accountToEdit}
                    open={!!accountToEdit}
                    onOpenChange={(open: boolean) => !open && setAccountToEdit(null)}
                />
            )}

            {accountToReconcile && (
                <ReconcileAccountDialog
                    account={accountToReconcile}
                    open={!!accountToReconcile}
                    onOpenChange={(open: boolean) => !open && setAccountToReconcile(null)}
                />
            )}
        </div>
    );
}
