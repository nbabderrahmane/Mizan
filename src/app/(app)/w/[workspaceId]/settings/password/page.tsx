"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePassword } from "@/app/auth/actions";
import { AlertCircle, Lock } from "lucide-react";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default function PasswordSettingsPage({ params }: PageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            setIsLoading(false);
            return;
        }

        const result = await changePassword(formData);

        if (result.success) {
            toast.success("Password updated successfully");
            // Optional: reset form
            const form = document.querySelector("form") as HTMLFormElement;
            form?.reset();
        } else {
            setError(result.error?.message || "Failed to update password");
            toast.error("Failed to update password");
        }

        setIsLoading(false);
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Change Password</h1>
                <p className="text-muted-foreground">
                    Update your account password securely.
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
                <form action={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                placeholder="••••••••"
                                className="pl-9"
                                required
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            We need to verify your current password first.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Updating..." : "Update Password"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
