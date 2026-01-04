import {
    getWorkspaceDetails,
    getWorkspaceMembers,
    getWorkspaceActivity
} from "../../actions";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { WorkspaceAdminActions } from "./actions-client"; // Client component
import { Users, Activity, Info, Calendar } from "lucide-react";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{
        workspaceId: string;
    }>;
}

export default async function AdminWorkspaceDetailPage({ params }: PageProps) {
    const { workspaceId } = await params;

    const [detailsResult, membersResult, activityResult] = await Promise.all([
        getWorkspaceDetails(workspaceId),
        getWorkspaceMembers(workspaceId),
        getWorkspaceActivity(workspaceId)
    ]);

    if (!detailsResult.success || !detailsResult.data) {
        // Handle not found or error
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Workspace not found</h1>
                <p className="text-muted-foreground">Unable to load workspace details. It may not exist or you lack invalid permissions.</p>
            </div>
        );
    }

    const workspace = detailsResult.data;
    const members = membersResult.data || [];
    const activity = activityResult.data || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
                        <Badge variant={workspace.status === "suspended" ? "destructive" : "default"} className={workspace.status === "active" ? "bg-green-600" : ""}>
                            {workspace.status || "active"}
                        </Badge>
                        {workspace.deleted_at && <Badge variant="destructive">Deleted</Badge>}
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs">{workspace.id}</span>
                        <span>•</span>
                        <span>Created {format(new Date(workspace.created_at), "PPP")}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <WorkspaceAdminActions
                        workspaceId={workspace.id}
                        currentStatus={workspace.status || "active"}
                        isDeleted={!!workspace.deleted_at}
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
                    <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Owner</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-md font-bold truncate" title={workspace.owner_email || ""}>
                                    {workspace.owner_email || "Unknown"}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {workspace.created_by_name || "No name"}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Members</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{workspace.member_count}</div>
                                <p className="text-xs text-muted-foreground">Active users</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Created</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-md font-bold">{format(new Date(workspace.created_at), "MMM d, yyyy")}</div>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(workspace.created_at), "h:mm a")}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Metadata Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <span className="font-semibold block text-muted-foreground">Workspace ID</span>
                                    <span className="font-mono bg-muted px-2 py-0.5 rounded">{workspace.id}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block text-muted-foreground">Status</span>
                                    <span className="capitalize">{workspace.status}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block text-muted-foreground">Owner Email</span>
                                    <span>{workspace.owner_email}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workspace Members</CardTitle>
                            <CardDescription>All users with access to this workspace.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((m: any) => (
                                        <TableRow key={m.user_id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{m.profiles?.full_name || "Unknown"}</span>
                                                    <span className="text-xs text-muted-foreground">{m.profiles?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{m.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(m.joined_at), "MMM d, yyyy")}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Audit logs for this workspace (last 20 events).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Actor</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activity.map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs">{log.action}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    {log.actor_email && <span className="text-xs">{log.actor_email}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(log.created_at), "MMM d, HH:mm")}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate" title={JSON.stringify(log.payload_public)}>
                                                {JSON.stringify(log.payload_public)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {activity.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                                No activity logs found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
