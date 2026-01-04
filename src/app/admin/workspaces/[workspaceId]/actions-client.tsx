"use strict";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TriangleAlert, Play, Trash2, Ban } from "lucide-react";
import { suspendWorkspace, reactivateWorkspace, softDeleteWorkspace } from "../../actions";
import { useRouter } from "next/navigation";

interface WorkspaceAdminActionsProps {
    workspaceId: string;
    currentStatus: string;
    isDeleted: boolean;
}

export function WorkspaceAdminActions({ workspaceId, currentStatus, isDeleted }: WorkspaceAdminActionsProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [suspendReason, setSuspendReason] = useState("");
    const [deleteReason, setDeleteReason] = useState("");
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    async function handleSuspend() {
        if (!suspendReason) return;
        setLoading(true);
        try {
            const result = await suspendWorkspace(workspaceId, suspendReason);
            if (result.success) {
                toast({ title: "Workspace suspended", description: "The workspace has been suspended successfully." });
                setSuspendOpen(false);
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error?.message || "Failed to suspend workspace", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleReactivate() {
        setLoading(true);
        try {
            const result = await reactivateWorkspace(workspaceId);
            if (result.success) {
                toast({ title: "Workspace reactivated", description: "The workspace is now active." });
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error?.message || "Failed to reactivate workspace", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!deleteReason) return;
        setLoading(true);
        try {
            const result = await softDeleteWorkspace(workspaceId, deleteReason);
            if (result.success) {
                toast({ title: "Workspace deleted", description: "The workspace has been soft-deleted." });
                setDeleteOpen(false);
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error?.message || "Failed to delete workspace", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    }

    if (isDeleted) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted/50 rounded-lg border border-dashed">
                <Trash2 className="h-4 w-4" />
                <span className="text-sm">This workspace has been deleted.</span>
            </div>
        );
    }

    return (
        <div className="flex gap-2">
            {currentStatus === "suspended" ? (
                <Button
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={handleReactivate}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Reactivate
                </Button>
            ) : (
                <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                            <Ban className="mr-2 h-4 w-4" />
                            Suspend
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Suspend Workspace</DialogTitle>
                            <DialogDescription>
                                Preventing access to this workspace. Owners will be notified (if implemented).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason for suspension</Label>
                                <Input
                                    id="reason"
                                    placeholder="Violation of terms, non-payment..."
                                    value={suspendReason}
                                    onChange={(e) => setSuspendReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={handleSuspend}
                                disabled={loading || !suspendReason}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Suspend Workspace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Soft Delete Workspace</DialogTitle>
                        <DialogDescription>
                            This will mark the workspace as deleted. Data is preserved but inaccessible.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="del-reason">Reason for deletion</Label>
                            <Input
                                id="del-reason"
                                placeholder="Requested by user..."
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={loading || !deleteReason}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Workspace
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
