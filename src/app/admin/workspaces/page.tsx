import { listAllWorkspaces } from "../actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { WorkspaceToolbar } from "./workspace-toolbar";
import { PaginationControls } from "./pagination-controls";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
    searchParams: Promise<{
        page?: string;
        search?: string;
        status?: string;
    }>;
}

export default async function AdminWorkspacesPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";
    const status = params.status || "all";
    const limit = 20;
    const offset = (page - 1) * limit;

    const result = await listAllWorkspaces(limit, offset, search, status);
    const { workspaces, total } = result.data || { workspaces: [], total: 0 };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
                <p className="text-muted-foreground">Detailed list of all workspaces.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Workspaces</CardTitle>
                    <CardDescription>
                        Manage workspaces, view members, and audit status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <WorkspaceToolbar />

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-center">Members</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workspaces.map((ws) => (
                                <TableRow key={ws.id} className={ws.deleted_at ? "opacity-50 bg-muted/50" : ""}>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {ws.deleted_at ? (
                                                <Badge variant="destructive">Deleted</Badge>
                                            ) : (
                                                <Badge variant={ws.status === "suspended" ? "destructive" : "default"} className={ws.status === "active" ? "bg-green-600 hover:bg-green-700" : ""}>
                                                    {ws.status || "active"}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {ws.name}
                                        {ws.deleted_at && <span className="block text-xs text-muted-foreground">Deleted on {format(new Date(ws.deleted_at), "MMM d, yyyy")}</span>}
                                    </TableCell>
                                    <TableCell>{ws.owner_email}</TableCell>
                                    <TableCell>
                                        {format(new Date(ws.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="rounded-full px-2">
                                            {ws.member_count}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/admin/workspaces/${ws.id}`}>
                                                View Details
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {workspaces.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                        No workspaces found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <PaginationControls total={total} limit={limit} />
                </CardContent>
            </Card>
        </div>
    );
}
