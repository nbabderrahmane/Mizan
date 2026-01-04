"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Ban, CheckCircle, KeyRound, Copy, Check } from "lucide-react";
import { banUser, unbanUser, adminResetPassword } from "../../actions";
import { useRouter } from "next/navigation";

interface UserAdminActionsProps {
    userId: string;
    isBanned: boolean;
}

export function UserAdminActions({ userId, isBanned }: UserAdminActionsProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [banReason, setBanReason] = useState("");
    const [banOpen, setBanOpen] = useState(false);

    // Reset Password State
    const [resetOpen, setResetOpen] = useState(false);
    const [newPassword, setNewPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleBan() {
        if (!banReason) return;
        setLoading(true);
        try {
            const result = await banUser(userId, banReason);
            if (result.success) {
                toast({ title: "User banned", description: "The user has been banned successfully." });
                setBanOpen(false);
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error?.message || "Failed to ban user", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleUnban() {
        setLoading(true);
        try {
            const result = await unbanUser(userId);
            if (result.success) {
                toast({ title: "User unbanned", description: "The user has been unbanned successfully." });
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error?.message || "Failed to unban user", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword() {
        setLoading(true);
        try {
            const result = await adminResetPassword(userId);
            if (result.success && result.data) {
                setNewPassword(result.data);
                toast({ title: "Password Reset", description: "New password generated successfully." });
            } else {
                toast({ title: "Error", description: result.error?.message || "Failed to reset password", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    }

    function copyToClipboard() {
        if (newPassword) {
            navigator.clipboard.writeText(newPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: "Copied!", description: "Password copied to clipboard." });
        }
    }

    function closeResetDialog() {
        setResetOpen(false);
        setNewPassword(null); // Clear sensitive data
    }

    return (
        <div className="flex gap-2">
            {/* Reset Password Dialog */}
            <Dialog open={resetOpen} onOpenChange={(open) => { if (!open) closeResetDialog(); else setResetOpen(true); }}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset Password
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset User Password</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reset this user's password?
                            This will generate a random secure password.
                        </DialogDescription>
                    </DialogHeader>

                    {!newPassword ? (
                        <div className="py-4 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                            Warning: This action cannot be undone. The user will need the new password to log in.
                        </div>
                    ) : (
                        <div className="py-4 space-y-4">
                            <div className="text-sm font-medium text-green-600">
                                Password Reset Successfully!
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 p-3 bg-muted rounded-md font-mono text-lg text-center select-all">
                                    {newPassword}
                                </code>
                                <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Copy this password now. It will not be shown again.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        {!newPassword ? (
                            <>
                                <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleResetPassword}
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Generate New Password
                                </Button>
                            </>
                        ) : (
                            <Button onClick={closeResetDialog}>Done</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isBanned ? (
                <Button
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={handleUnban}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Unban User
                </Button>
            ) : (
                <Dialog open={banOpen} onOpenChange={setBanOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Ban className="mr-2 h-4 w-4" />
                            Ban User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ban User</DialogTitle>
                            <DialogDescription>
                                This will prevent the user from accessing the platform.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason for ban</Label>
                                <Input
                                    id="reason"
                                    placeholder="Violation of terms..."
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setBanOpen(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={handleBan}
                                disabled={loading || !banReason}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ban User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
