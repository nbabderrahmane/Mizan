"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { revalidatePath } from "next/cache";

export type NotificationType = "invite" | "workspace_update" | "system";

export type Notification = {
    id: string;
    user_id: string;
    workspace_id: string | null;
    type: NotificationType;
    title: string;
    body: string | null;
    href: string | null;
    is_read: boolean;
    created_at: string;
};

export type NotificationResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

/**
 * List notifications for the current user.
 */
export async function listNotifications(limit = 20): Promise<NotificationResult<Notification[]>> {
    const logger = createLogger();

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: createSafeError("Not authenticated", logger.correlationId) };

        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { success: true, data: data || [] };

    } catch (error) {
        logger.error("Error listing notifications", error as Error, { action: "listNotifications" });
        return { success: false, error: createSafeError("Failed to load notifications", logger.correlationId) };
    }
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(id: string): Promise<NotificationResult> {
    const logger = createLogger();

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: createSafeError("Not authenticated", logger.correlationId) };

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;

        revalidatePath("/", "layout");
        return { success: true };

    } catch (error) {
        logger.error("Error marking notification read", error as Error, { action: "markNotificationRead" });
        return { success: false, error: createSafeError("Failed to update notification", logger.correlationId) };
    }
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsRead(): Promise<NotificationResult> {
    const logger = createLogger();

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: createSafeError("Not authenticated", logger.correlationId) };

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) throw error;

        revalidatePath("/", "layout");
        return { success: true };

    } catch (error) {
        logger.error("Error marking all read", error as Error, { action: "markAllNotificationsRead" });
        return { success: false, error: createSafeError("Failed to update notifications", logger.correlationId) };
    }
}

/**
 * Internal helper to create a notification.
 * (This would typically be called from other server actions)
 */
export async function createNotification({
    userId,
    workspaceId,
    type,
    title,
    body,
    href
}: {
    userId: string;
    workspaceId?: string;
    type: NotificationType;
    title: string;
    body?: string;
    href?: string;
}): Promise<NotificationResult<Notification>> {
    const logger = createLogger();

    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("notifications")
            .insert({
                user_id: userId,
                workspace_id: workspaceId || null,
                type,
                title,
                body: body || null,
                href: href || null,
            });

        if (error) throw error;

        revalidatePath("/", "layout"); // Revalidate to show unread indicator
        // We can't return the data because RLS prevents reading notifications for other users
        return { success: true };

    } catch (error) {
        logger.error("Error creating notification", error as Error, { action: "createNotification" });
        return { success: false, error: createSafeError("Failed to send notification", logger.correlationId) };
    }
}
