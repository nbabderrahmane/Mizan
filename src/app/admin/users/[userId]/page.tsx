import { getAdminUserDetails } from "../../actions";
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
import { UserAdminActions } from "./actions-client";
import { User, Mail, Calendar, Building2, Shield } from "lucide-react";

interface PageProps {
    params: Promise<{
        userId: string;
    }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
    const { userId } = await params;

    const result = await getAdminUserDetails(userId);

    if (!result.success || !result.data) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">User not found</h1>
                <p className="text-muted-foreground">Unable to load user details.</p>
            </div>
        );
    }

    const { profile, memberships } = result.data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold tracking-tight">{profile.full_name || "No Name"}</h1>
                        <Badge variant={profile.is_banned ? "destructive" : "outline"} className={!profile.is_banned ? "border-green-600 text-green-600" : ""}>
                            {profile.is_banned ? "Banned" : "Active"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>{profile.email}</span>
                        <span className="text-gray-300">|</span>
                        <span className="font-mono text-xs text-muted-foreground">ID: {profile.id}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <UserAdminActions
                        userId={profile.id}
                        isBanned={profile.is_banned}
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="workspaces">Workspaces ({memberships.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Joined Date</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-md font-bold">{format(new Date(profile.created_at), "PPP")}</div>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(profile.created_at), "p")}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Last Sign In</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-md font-bold">
                                    {profile.last_sign_in_at ? format(new Date(profile.last_sign_in_at), "PPP") : "Never"}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {profile.last_sign_in_at ? format(new Date(profile.last_sign_in_at), "p") : "No login recorded"}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Status</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-md font-bold capitalize">
                                    {profile.is_banned ? "Banned" : "Active"}
                                </div>
                                {profile.is_banned && profile.banned_at && (
                                    <p className="text-xs text-destructive">
                                        Since {format(new Date(profile.banned_at), "MMM d, yyyy")}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Avatar URL</CardTitle>
                                <User className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs truncate max-w-[200px]" title={profile.avatar_url || "None"}>
                                    {profile.avatar_url || "Not set"}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="workspaces">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workspace Memberships</CardTitle>
                            <CardDescription>Workspaces this user is a member of.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Workspace Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {memberships.map((m: any) => (
                                        <TableRow key={m.workspaces.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    {m.workspaces.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{m.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={m.workspaces.status === "suspended" ? "text-destructive" : "text-green-600"}>
                                                    {m.workspaces.status || "active"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(m.joined_at), "MMM d, yyyy")}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {memberships.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                                No workspace memberships found.
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
