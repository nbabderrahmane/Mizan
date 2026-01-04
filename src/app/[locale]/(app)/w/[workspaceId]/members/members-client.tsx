"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Trash2,
    Loader2,
    Check,
    UserMinus,
    Shield,
    User,
    UserCog,
    MoreHorizontal,
    Mail,
    UserPlus,
    Copy,
    Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberProfile, updateMemberRole, removeMember } from "@/lib/actions/workspace";
import { createInvite, revokeInvite, Invite } from "@/lib/actions/invite";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";

interface MembersClientProps {
    workspaceId: string;
    currentUserId: string;
    isOwner: boolean;
    initialMembers: MemberProfile[];
    initialInvites: Invite[];
}

export function MembersClient({
    workspaceId,
    currentUserId,
    isOwner,
    initialMembers,
    initialInvites,
}: MembersClientProps) {
    const t = useTranslations("Members");
    const common = useTranslations("Common");
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();
    const [members, setMembers] = useState<MemberProfile[]>(initialMembers);
    const [invites, setInvites] = useState<Invite[]>(initialInvites);
    const [isUpdatingMember, setIsUpdatingMember] = useState<string | null>(null);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Invite form state
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"MANAGER" | "CONTRIBUTOR" | "VIEWER">("CONTRIBUTOR");
    const [isCreating, setIsCreating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    useEffect(() => {
        setMembers(initialMembers);
        setInvites(initialInvites);
    }, [initialMembers, initialInvites]);

    async function handleRoleUpdate(targetUserId: string, newRole: "OWNER" | "MANAGER" | "CONTRIBUTOR" | "VIEWER") {
        setIsUpdatingMember(targetUserId);
        const result = await updateMemberRole(workspaceId, targetUserId, newRole);
        setIsUpdatingMember(null);

        if (result.success) {
            toast({ title: common("success") });
            router.refresh();
        } else {
            toast({ title: common("error"), description: result.error?.message, variant: "destructive" });
        }
    }

    async function handleRemoveMember(targetUserId: string) {
        if (!confirm(t("removeConfirm"))) return;

        setIsUpdatingMember(targetUserId);
        const result = await removeMember(workspaceId, targetUserId);
        setIsUpdatingMember(null);

        if (result.success) {
            toast({ title: common("success") });
            router.refresh();
        } else {
            toast({ title: common("error"), description: result.error?.message, variant: "destructive" });
        }
    }

    async function handleCreateInvite() {
        setIsCreating(true);
        try {
            const result = await createInvite(workspaceId, role, email);
            if (result.success && result.data) {
                const link = `${window.location.origin}/invite/${result.data.token}`;
                setGeneratedLink(link);
                setShowSuccessDialog(true);
                setEmail("");
                router.refresh();
            } else {
                toast({ title: common("error"), description: result.error?.message, variant: "destructive" });
            }
        } finally {
            setIsCreating(false);
        }
    }

    async function handleRevoke(inviteId: string) {
        if (!confirm(t("revokeConfirm"))) return;

        setIsRevoking(inviteId);
        try {
            const result = await revokeInvite(inviteId, workspaceId);
            if (result.success) {
                toast({ title: common("success") });
                router.refresh();
            } else {
                toast({ title: common("error"), description: result.error?.message, variant: "destructive" });
            }
        } finally {
            setIsRevoking(null);
        }
    }

    function copyInviteLink(token: string) {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
        toast({ title: t("linkCopied"), description: t("shareWithTeam") });
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
            </div>

            <Tabs defaultValue="members" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="members" className="gap-2">
                        <User className="w-4 h-4" />
                        {t("activeMembers")} ({members.length})
                    </TabsTrigger>
                    <TabsTrigger value="invites" className="gap-2">
                        <Mail className="w-4 h-4" />
                        {t("pendingInvites")} ({invites.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("currentMembers")}</CardTitle>
                                <CardDescription>{t("peopleWithAccess")}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("member")}</TableHead>
                                        <TableHead>{t("role")}</TableHead>
                                        <TableHead className="text-right">{t("joined")}</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((member) => (
                                        <TableRow key={member.user_id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                                                        {member.first_name?.[0]}{member.last_name?.[0]}
                                                        {!member.first_name && <User className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">
                                                            {member.first_name} {member.last_name}
                                                            {member.user_id === currentUserId && ` (${t("you")})`}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{member.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={member.role === "OWNER" ? "default" : "secondary"} className="font-normal capitalize">
                                                    {member.role === "OWNER" && <Shield className="w-3 h-3 mr-1 text-primary" />}
                                                    {member.role.toLowerCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground font-mono">
                                                {format(new Date(member.joined_at), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                {isOwner && member.user_id !== currentUserId && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" disabled={isUpdatingMember === member.user_id}>
                                                                {isUpdatingMember === member.user_id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>{common("actions")}</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleRoleUpdate(member.user_id, "MANAGER")}>
                                                                <UserCog className="w-4 h-4 mr-2" />
                                                                {t("makeManager")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleRoleUpdate(member.user_id, "CONTRIBUTOR")}>
                                                                <User className="w-4 h-4 mr-2" />
                                                                {t("makeContributor")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleRoleUpdate(member.user_id, "VIEWER")}>
                                                                <User className="w-4 h-4 mr-2" />
                                                                {t("makeViewer")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive font-medium"
                                                                onClick={() => handleRemoveMember(member.user_id)}
                                                            >
                                                                <UserMinus className="w-4 h-4 mr-2" />
                                                                {t("removeFromWorkspace")}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invites" className="space-y-6">
                    {isOwner && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    {t("newInvitation")}
                                </CardTitle>
                                <CardDescription>
                                    {t("inviteDescription")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t("emailOptional")}</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="colleague@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">{t("role")}</Label>
                                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MANAGER">Manager</SelectItem>
                                                <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                                                <SelectItem value="VIEWER">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <Button className="w-full md:w-auto" onClick={handleCreateInvite} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                                        {t("generateLink")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {t("pendingInvites")}
                        </h3>

                        {invites.length === 0 ? (
                            <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
                                {t("noPendingInvites")}
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead>{t("recipient")}</TableHead>
                                            <TableHead>{t("role")}</TableHead>
                                            <TableHead>{t("expires")}</TableHead>
                                            <TableHead className="text-right">{common("actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invites.map((invite) => (
                                            <TableRow key={invite.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">
                                                            {invite.invited_email || "Anyone with link"}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            {invite.token.substring(0, 8)}...
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal capitalize">
                                                        {invite.role.toLowerCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(invite.expires_at), "MMM d")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 px-2"
                                                            onClick={() => copyInviteLink(invite.token)}
                                                        >
                                                            {copiedToken === invite.token ? (
                                                                <Check className="w-4 h-4 text-emerald-500" />
                                                            ) : (
                                                                <Copy className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleRevoke(invite.id)}
                                                            disabled={isRevoking === invite.id}
                                                        >
                                                            {isRevoking === invite.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("inviteCreated")}</DialogTitle>
                        <DialogDescription>
                            {t("inviteReady")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <Input
                            readOnly
                            value={generatedLink || ""}
                            className="flex-1 font-mono text-sm"
                        />
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                                if (generatedLink) {
                                    navigator.clipboard.writeText(generatedLink);
                                    toast({ title: t("linkCopied") });
                                }
                            }}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowSuccessDialog(false)}>
                            {common("done")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
