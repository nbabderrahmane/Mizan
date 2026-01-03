import { getWorkspace } from "@/lib/actions/workspace";
import { listAccounts } from "@/lib/actions/account";
import { getDashboardStats } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickStart } from "./quick-start";
import { ExpenseChart } from "./expense-chart";
import { MonthFilter } from "./month-filter";
import { BalanceChart } from "./balance-chart";
import { DashboardInteractives } from "./dashboard-interactives";

export default async function DashboardPage({
    params,
}: {
    params: Promise<{ workspaceId: string }>;
}) {
    const resolvedParams = await params;
    const workspaceId = resolvedParams.workspaceId;

    // Fetch workspace and stats
    const [workspaceResult, stats, accountsResult] = await Promise.all([
        getWorkspace(workspaceId),
        getDashboardStats(workspaceId),
        listAccounts(workspaceId),
    ]);

    if (!workspaceResult.success || !workspaceResult.data) {
        return (
            <div className="p-6">
                <p className="text-destructive">Workspace not found</p>
            </div>
        );
    }

    const workspace = workspaceResult.data;
    const currency = workspace.currency || "USD";

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{workspace.name}</h1>
                    <p className="text-muted-foreground">
                        Welcome to your workspace dashboard
                    </p>
                </div>
                <MonthFilter />
            </div>

            {/* Quick Start Checklist */}
            <QuickStart workspaceId={workspaceId} stats={stats} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(stats.totalBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across all accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(stats.availableCash)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Ready to spend (Total - Reserved)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(stats.monthlyIncome - stats.monthlyExpenses)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Income - Expenses
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reserved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(stats.reservedTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Funds set aside for plans
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
