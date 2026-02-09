"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { revalidatePath } from "next/cache";

export type UploadResult = {
    success: boolean;
    filePath?: string;
    fileType?: string;
    fileSize?: number;
    error?: { message: string; correlationId: string };
};

/**
 * Uploads a file to the 'attachments' bucket and returns the path.
 * This is a Server Action handling FormData directly.
 */
export async function uploadAttachment(formData: FormData): Promise<UploadResult> {
    const logger = createLogger();

    try {
        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, error: createSafeError("No file provided", logger.correlationId) };
        }

        // Validate Size (e.g., 5MB limit)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return { success: false, error: createSafeError("File size exceeds 5MB limit", logger.correlationId) };
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: createSafeError("Unauthorized", logger.correlationId) };
        }

        // Generate unique path: user_id/timestamp_filename
        const fileExt = file.name.split('.').pop();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const filePath = `${user.id}/${uniqueSuffix}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

        if (uploadError) {
            logger.error("Storage upload failed", uploadError);
            return { success: false, error: createSafeError("Upload failed", logger.correlationId) };
        }

        return {
            success: true,
            filePath,
            fileType: file.type,
            fileSize: file.size
        };

    } catch (error) {
        logger.error("Unexpected upload error", error as Error);
        return { success: false, error: createSafeError("Upload failed", logger.correlationId) };
    }
}

/**
 * Delete an attachment from storage
 */
export async function deleteAttachment(filePath: string) {
    const logger = createLogger();
    try {
        const supabase = await createClient();
        const { error } = await supabase.storage.from('attachments').remove([filePath]);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        logger.error("Delete attachment failed", error as Error, { filePath });
        return { success: false, error: createSafeError("Delete failed", logger.correlationId) };
    }
}
