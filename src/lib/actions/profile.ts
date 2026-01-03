"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { updateProfileSchema } from "@/lib/validations/profile";
import { revalidatePath } from "next/cache";

export type ProfileResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

export async function updateProfile(formData: FormData): Promise<ProfileResult> {
    const logger = createLogger();

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: createSafeError("Not authenticated", logger.correlationId) };
        }

        const rawData = {
            first_name: formData.get("first_name"),
            last_name: formData.get("last_name"),
        };

        const validated = updateProfileSchema.parse(rawData);

        // Update profile
        const { error } = await supabase
            .from("profiles")
            .update({
                first_name: validated.first_name,
                last_name: validated.last_name,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) throw error;

        revalidatePath("/w/[workspaceId]/settings/profile", "page");

        return { success: true };

    } catch (error) {
        logger.error("Error updating profile", error as Error, { action: "updateProfile" });
        return {
            success: false,
            error: createSafeError("Failed to update profile", logger.correlationId),
        };
    }
}
