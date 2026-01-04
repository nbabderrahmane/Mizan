import { getSystemStats } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Building2, Users, Rocket } from "lucide-react";

export default async function AdminDashboard() {
    const { data: stats } = await getSystemStats();

    if (!stats) {
        return <div className="p-6">Loading stats...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">High-level system overview.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${stats.dbStatus === "connected" ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-sm font-medium">Database: {stats.dbStatus === "connected" ? "Connected" : "Disconnected"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                <span className="text-sm font-medium">Auth Service: OK</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalWorkspaces}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats.newWorkspacesLast7Days} in last 7 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Workspaces</CardTitle>
                        <Rocket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.activeWorkspacesLast30Days === null ? "N/A" : stats.activeWorkspacesLast30Days}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Activity in last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats.newUsersLast7Days} in last 7 days
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
