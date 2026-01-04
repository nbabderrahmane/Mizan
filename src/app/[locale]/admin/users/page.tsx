import { getAdminUsers } from "../actions";
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
import { UsersToolbar } from "./users-toolbar";
import { PaginationControls } from "../workspaces/pagination-controls"; // Reusing pagination
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
    searchParams: Promise<{
        page?: string;
        search?: string;
        status?: string;
    }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";
    const status = params.status || "all";
    const limit = 20;
    const offset = (page - 1) * limit;

    const result = await getAdminUsers(limit, offset, search, status);
    const { users, total } = result.data || { users: [], total: 0 };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                <p className="text-muted-foreground">Manage all registered users.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                        A list of all users on the platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersToolbar />

                    {result.error && (
                        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md mb-4 text-sm font-medium">
                            Error loading users: {result.error.message} (Correlation ID: {result.error.correlationId})
                        </div>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Last Sign In</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className={user.is_banned ? "opacity-75 bg-red-50" : ""}>
                                    <TableCell>
                                        <Badge variant={user.is_banned ? "destructive" : "outline"} className={!user.is_banned ? "border-green-600 text-green-600" : ""}>
                                            {user.is_banned ? "Banned" : "Active"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.full_name || "No name"}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(user.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), "MMM d, HH:mm") : "Never"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/admin/users/${user.id}`}>
                                                View Details
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        No users found.
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
