"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Save, Loader2, Check } from "lucide-react";
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
import { updateWorkspace, deleteWorkspace } from "@/lib/actions/workspace";
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
    MoreHorizontal,
    UserMinus,
    Shield,
    User,
    UserCog,
    PlusCircle
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { format } from "date-fns";

interface SettingsPageClientProps {
    workspaceId: string;
    workspaceName: string;
    currency: string;
    isOwner: boolean;
    currentUserId: string;
}

const CURRENCIES = [
    { code: "USD", label: "US Dollar ($)", symbol: "$" },
    { code: "EUR", label: "Euro (€)", symbol: "€" },
    { code: "GBP", label: "British Pound (£)", symbol: "£" },
    { code: "MAD", label: "Moroccan Dirham (MAD)", symbol: "DH" },
    { code: "AED", label: "UAE Dirham (AED)", symbol: "AED" },
    { code: "SAR", label: "Saudi Riyal (SAR)", symbol: "SAR" },
    { code: "CAD", label: "Canadian Dollar (CA$)", symbol: "CA$" },
    { code: "AUD", label: "Australian Dollar (A$)", symbol: "A$" },
];

export function SettingsPageClient({
    workspaceId,
    workspaceName,
    currency,
    isOwner,
    currentUserId,
}: SettingsPageClientProps) {
    const router = useRouter();
    const [name, setName] = useState(workspaceName);
    const [selectedCurrency, setSelectedCurrency] = useState(currency || "USD");
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync state with props when they change
    useEffect(() => {
        setName(workspaceName);
        setSelectedCurrency(currency || "USD");
    }, [workspaceName, currency]);

    async function handleSave() {
        setIsSaving(true);
        setError(null);
        setShowSuccess(false);

        const formData = new FormData();
        formData.append("name", name);
        formData.append("currency", selectedCurrency);

        const result = await updateWorkspace(workspaceId, formData);

        setIsSaving(false);

        if (result.success) {
            setShowSuccess(true);
            router.refresh();
            setTimeout(() => setShowSuccess(false), 3000);
        } else {
            setError(result.error?.message || "Failed to update workspace");
        }
    }


    async function handleDelete() {
        if (confirmText !== workspaceName) return;

        setIsDeleting(true);
        setError(null);

        const result = await deleteWorkspace(workspaceId);

        if (result.success) {
            if (result.data) {
                router.push(`/w/${result.data}/dashboard`);
            } else {
                router.push("/onboarding/create-workspace");
            }
        } else {
            setError(result.error?.message || "Failed to delete workspace");
            setIsDeleting(false);
        }
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage workspace settings and members
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generals</CardTitle>
                            <CardDescription>
                                Update your workspace details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Workspace Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!isOwner}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select
                                    value={selectedCurrency}
                                    onValueChange={setSelectedCurrency}
                                    disabled={!isOwner}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {isOwner && (
                                <div className="flex items-center justify-end gap-4 pt-2">
                                    {showSuccess && (
                                        <span className="text-sm text-green-600 flex items-center animate-in fade-in slide-in-from-right-2">
                                            <Check className="w-4 h-4 mr-1" />
                                            Saved!
                                        </span>
                                    )}
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {!isSaving && !showSuccess && <Save className="mr-2 h-4 w-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workspace Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>ID</Label>
                                <p className="text-sm text-muted-foreground mt-1 font-mono break-all bg-muted p-2 rounded">
                                    {workspaceId}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {isOwner && (
                        <Card className="border-destructive/50">
                            <CardHeader>
                                <CardTitle className="text-destructive flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Danger Zone
                                </CardTitle>
                                <CardDescription>
                                    Irreversible actions that affect your workspace
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Workspace
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Workspace
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete
                            the workspace and all its data including accounts,
                            categories, transactions, and members.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <p className="text-sm">
                            Type <strong>{workspaceName}</strong> to confirm:
                        </p>
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={workspaceName}
                        />
                        {error && !isSaving && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={confirmText !== workspaceName || isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete Workspace"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
