"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { signIn } from "../actions";

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get("returnTo");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const result = await signIn(formData);

        if (result.success) {
            router.push(returnTo || "/");
        } else {
            setError(result.error?.message || "An error occurred");
        }

        setIsLoading(false);
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>
                    Sign in to your Mizan account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/sign-up" className="text-primary hover:underline">
                        Sign up
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Suspense fallback={
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Welcome back</CardTitle>
                        <CardDescription>Loading...</CardDescription>
                    </CardHeader>
                </Card>
            }>
                <SignInForm />
            </Suspense>
        </div>
    );
}
