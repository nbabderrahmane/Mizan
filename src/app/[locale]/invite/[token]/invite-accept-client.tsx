"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions/invite";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteAcceptClientProps {
    token: string;
    workspaceName: string;
    role: string;
}

export function InviteAcceptClient({ token, workspaceName, role }: InviteAcceptClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleAccept() {
        setIsLoading(true);
        setError(null);

        try {
            const result = await acceptInvite(token);

            if (result.success) {
                setIsSuccess(true);
                toast({
                    title: "Success",
                    description: `You have joined ${workspaceName}`,
                });

                // Redirect after a short delay
                setTimeout(() => {
                    router.push(`/w/${result.data?.workspaceId}/dashboard`);
                }, 1500);
            } else {
                setError(result.error?.message || "Failed to accept invitation");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    if (isSuccess) {
        return (
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <h2 className="text-2xl font-bold">Welcome to {workspaceName}!</h2>
                <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">You've been invited!</h1>
                <p className="text-muted-foreground">
                    You have been invited to join <strong>{workspaceName}</strong> as a <strong>{role.toLowerCase()}</strong>.
                </p>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            <Button
                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20"
                onClick={handleAccept}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Joining...
                    </>
                ) : (
                    "Accept Invitation"
                )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
                By joining, you will have access to all shared financial data in this workspace.
            </p>
        </div>
    );
}
