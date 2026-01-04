import { getAdminAuditLogs } from "../actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { AuditLogsToolbar } from "./audit-logs-toolbar";
import { PaginationControls } from "../workspaces/pagination-controls";
import { Badge } from "@/components/ui/badge";

interface PageProps {
    searchParams: Promise<{
        page?: string;
        action?: string;
        dateFrom?: string;
        dateTo?: string;
    }>;
}

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const action = params.action || "";
    const dateFrom = params.dateFrom || "";
    const dateTo = params.dateTo || "";

    const limit = 50;
    const offset = (page - 1) * limit;

    const result = await getAdminAuditLogs(limit, offset, {
        action,
        dateFrom,
        dateTo
    });

    const { logs, total } = result.data || { logs: [], total: 0 };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <p className="text-muted-foreground">System-wide activity log.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>
                        Search and filter system events.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AuditLogsToolbar />

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Payload</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="w-[180px]">
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {format(new Date(log.created_at), "MMM d, yyyy")}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(log.created_at), "HH:mm:ss")}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">{log.actor_name || "Unknown"}</span>
                                            <span className="text-xs text-muted-foreground">{log.actor_email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="font-semibold">{log.entity_type}</span>
                                            <span className="font-mono text-muted-foreground">{log.entity_id}</span>
                                            {log.workspace_name && (
                                                <span className="text-muted-foreground mt-1">WS: {log.workspace_name}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <div className="text-xs font-mono text-muted-foreground truncate" title={JSON.stringify(log.payload, null, 2)}>
                                            {JSON.stringify(log.payload)}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                        No logs found matching your criteria.
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
