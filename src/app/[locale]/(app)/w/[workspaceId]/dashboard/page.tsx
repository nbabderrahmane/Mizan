import { getWorkspace } from "@/lib/actions/workspace";
import { listAccounts } from "@/lib/actions/account";
import { getDashboardStats } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickStart } from "./quick-start";
import { ExpenseChart } from "./expense-chart";
import { MonthFilter } from "./month-filter";
import { BalanceChart } from "./balance-chart";
import { DashboardInteractives } from "./dashboard-interactives";
import { getTranslations } from "next-intl/server";
import { listCategories } from "@/lib/actions/category";

export default async function DashboardPage({
    params,
}: {
    params: Promise<{ workspaceId: string; locale: string }>;
}) {
    const { workspaceId, locale } = await params;
    const t = await getTranslations("Dashboard");
    const common = await getTranslations("Common");

    // Fetch workspace and stats
    const [workspaceResult, stats, accountsResult, categoriesResult] = await Promise.all([
        getWorkspace(workspaceId),
        getDashboardStats(workspaceId),
        listAccounts(workspaceId),
        listCategories(workspaceId),
    ]);

    if (!workspaceResult.success || !workspaceResult.data) {
        return (
            <div className="p-6">
                <p className="text-destructive">{common("error")}</p>
            </div>
        );
    }

    const workspace = workspaceResult.data;
    const currency = workspace.currency || "USD";

    // Formatters
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{workspace.name}</h1>
                    <p className="text-muted-foreground">
                        {t("welcomeDescription")}
                    </p>
                </div>
                <MonthFilter />
            </div>

            {/* Quick Start Checklist */}
            <QuickStart
                workspaceId={workspaceId}
                stats={stats}
                accounts={accountsResult.success ? accountsResult.data || [] : []}
                categories={categoriesResult.success ? categoriesResult.data || [] : []}
                currency={currency}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("totalBalance")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.totalBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t("totalBalanceDesc")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("available")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.availableCash)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t("availableDesc")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("netFlow")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.monthlyIncome - stats.monthlyExpenses)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t("netFlowDesc")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("reserved")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.reservedTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t("reservedDesc")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <DashboardInteractives
                workspaceId={workspaceId}
                currency={currency}
                dueAmount={stats.dueThisMonth}
                pendingPayments={stats.pendingPayments}
                accounts={accountsResult.success ? accountsResult.data || [] : []}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="lg:col-span-4">
                    <BalanceChart workspaceId={workspaceId} currency={currency} />
                </div>
                <div className="lg:col-span-3">
                    <ExpenseChart data={stats.expensesByCategory} currency={currency} />
                </div>
            </div>
        </div>
    );
}
