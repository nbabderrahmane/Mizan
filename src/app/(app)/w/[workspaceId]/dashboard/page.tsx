import { getWorkspace } from "@/lib/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage({
    params,
}: {
    params: Promise<{ workspaceId: string }>;
}) {
    const resolvedParams = await params;
    const workspaceResult = await getWorkspace(resolvedParams.workspaceId);

    if (!workspaceResult.success || !workspaceResult.data) {
        return (
            <div className="p-6">
                <p className="text-destructive">Workspace not found</p>
            </div>
        );
    }

    const workspace = workspaceResult.data;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{workspace.name}</h1>
                <p className="text-muted-foreground">
                    Welcome to your workspace dashboard
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                            Add accounts to see balance
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                            Balance minus provisions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                            Income - Expenses
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Provisions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                            Reserved for future bills
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Start</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>1. Add your accounts (bank, cash, savings) in the Accounts section</p>
                        <p>2. Set up categories and subcategories for your expenses</p>
                        <p>3. Create monthly budgets to plan your spending</p>
                        <p>4. Set up provisions for recurring future expenses</p>
                        <p>5. Start recording your transactions!</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
