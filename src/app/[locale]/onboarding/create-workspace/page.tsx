"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
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
import { createWorkspace } from "@/lib/actions/workspace";
import { signOut } from "@/lib/actions/auth";

export default function CreateWorkspacePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const result = await createWorkspace(formData);

        if (result.success && result.data) {
            // Redirect to setup wizard for new workspaces
            router.push(`/w/${result.data.id}/setup`);
        } else {
            setError(result.error?.message || "Failed to create workspace");
        }

        setIsLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Create your workspace</CardTitle>
                    <CardDescription>
                        A workspace is your shared budget book. You can invite family or
                        friends to manage finances together.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form action={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="name">Workspace Name</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="e.g., Family Budget, Household"
                                required
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Select name="currency" defaultValue="USD" disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="MAD">MAD (DH)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Select name="currency" defaultValue="USD" disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="MAD">MAD (DH)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create Workspace"}
                        </Button>
                    </form>

                    <div className="pt-4 border-t text-center">
                        <form action={signOut}>
                            <Button variant="ghost" size="sm" type="submit">
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign out
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

