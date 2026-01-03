"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { signUpSchema, signInSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthResult = {
    success: boolean;
    error?: { message: string; correlationId: string };
};

/**
 * Sign up a new user with email and password.
 * Profile is created automatically via database trigger.
 */
export async function signUp(formData: FormData): Promise<AuthResult> {
    const logger = createLogger();
    logger.info("signUp action started", { action: "signUp" });

    try {
        const rawData = {
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            fullName: formData.get("fullName") as string,
        };

        // Validate input
        const validatedData = signUpSchema.parse(rawData);
        logger.debug("Input validated", { action: "signUp" });

        const supabase = await createClient();

        // Check rate limit (basic implementation)
        const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
            p_key: `signup:${validatedData.email}`,
            p_max_requests: 5,
            p_window_seconds: 300,
        });

        if (rateLimitOk === false) {
            logger.warn("Rate limit exceeded for signup", {
                action: "signUp",
            });
            return {
                success: false,
                error: createSafeError(
                    "Too many signup attempts. Please try again in a few minutes.",
                    logger.correlationId
                ),
            };
        }

        // Sign up the user
        const { data, error } = await supabase.auth.signUp({
            email: validatedData.email,
            password: validatedData.password,
            options: {
                data: {
                    full_name: validatedData.fullName,
                },
            },
        });

        if (error) {
            logger.error("Supabase auth signUp failed", error, { action: "signUp" });
            return {
                success: false,
                error: createSafeError(error.message, logger.correlationId),
            };
        }

        if (!data.user) {
            logger.error("No user returned from signUp", undefined, { action: "signUp" });
            return {
                success: false,
                error: createSafeError(
                    "Account creation failed. Please try again.",
                    logger.correlationId
                ),
            };
        }

        logger.info("User signed up successfully", {
            action: "signUp",
            userId: data.user.id,
        });

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            logger.warn("Validation failed in signUp", { action: "signUp" });
            return {
                success: false,
                error: createSafeError("Please check your input and try again.", logger.correlationId),
            };
        }

        logger.error("Unexpected error in signUp", error as Error, { action: "signUp" });
        return {
            success: false,
            error: createSafeError(
                "An unexpected error occurred. Please try again.",
                logger.correlationId
            ),
        };
    }
}

/**
 * Sign in an existing user with email and password.
 */
export async function signIn(formData: FormData): Promise<AuthResult> {
    const logger = createLogger();
    logger.info("signIn action started", { action: "signIn" });

    try {
        const rawData = {
            email: formData.get("email") as string,
            password: formData.get("password") as string,
        };

        // Validate input
        const validatedData = signInSchema.parse(rawData);
        logger.debug("Input validated", { action: "signIn" });

        const supabase = await createClient();

        // Check rate limit
        const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
            p_key: `signin:${validatedData.email}`,
            p_max_requests: 10,
            p_window_seconds: 300,
        });

        if (rateLimitOk === false) {
            logger.warn("Rate limit exceeded for signin", { action: "signIn" });
            return {
                success: false,
                error: createSafeError(
                    "Too many login attempts. Please try again in a few minutes.",
                    logger.correlationId
                ),
            };
        }

        // Sign in the user
        const { data, error } = await supabase.auth.signInWithPassword({
            email: validatedData.email,
            password: validatedData.password,
        });

        if (error) {
            logger.warn("Supabase auth signIn failed", { action: "signIn" });
            return {
                success: false,
                error: createSafeError(
                    "Invalid email or password. Please try again.",
                    logger.correlationId
                ),
            };
        }

        logger.info("User signed in successfully", {
            action: "signIn",
            userId: data.user.id,
        });

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            logger.warn("Validation failed in signIn", { action: "signIn" });
            return {
                success: false,
                error: createSafeError("Please check your input and try again.", logger.correlationId),
            };
        }

        logger.error("Unexpected error in signIn", error as Error, { action: "signIn" });
        return {
            success: false,
            error: createSafeError(
                "An unexpected error occurred. Please try again.",
                logger.correlationId
            ),
        };
    }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
    const logger = createLogger();
    logger.info("signOut action started", { action: "signOut" });

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
        logger.error("Supabase auth signOut failed", error, { action: "signOut" });
    } else {
        logger.info("User signed out successfully", { action: "signOut" });
    }

    revalidatePath("/", "layout");
    redirect("/");
}
