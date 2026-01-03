"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/profile";
import { toast } from "sonner";

interface ProfileFormProps {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
}

export function ProfileForm({ firstName, lastName, email }: ProfileFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await updateProfile(formData);

        setIsLoading(false);

        if (result.success) {
            toast.success("Profile updated successfully");
            router.refresh();
        } else {
            toast.error(result.error?.message || "Failed to update profile");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            <div className="space-y-4 rounded-lg border bg-card p-6">
                <div>
                    <Label>Email</Label>
                    <Input value={email} disabled className="bg-muted" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Email cannot be changed.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                            id="first_name"
                            name="first_name"
                            defaultValue={firstName || ""}
                            placeholder="John"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                            id="last_name"
                            name="last_name"
                            defaultValue={lastName || ""}
                            placeholder="Doe"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </form>
    );
}
