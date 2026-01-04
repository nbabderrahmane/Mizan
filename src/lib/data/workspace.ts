
import { SupabaseClient } from "@supabase/supabase-js";
import { Workspace } from "@/lib/actions/workspace";
import { createLogger, createSafeError } from "@/lib/logger";

type Result<T> = {
    success: boolean;
    data?: T;
    error?: { message: string, correlationId: string };
};

export async function getWorkspacesData(
    supabase: SupabaseClient,
    userId: string
): Promise<Result<Workspace[]>> {
    const logger = createLogger();

    try {
        // Get memberships
        const { data: memberships, error: memberError } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", userId);

        if (memberError) {
            logger.error("Failed to fetch memberships", memberError, {
                action: "getWorkspacesData",
                userId,
            });
            return {
                success: false,
                error: createSafeError("Failed to fetch workspaces.", logger.correlationId),
            };
        }

        if (!memberships || memberships.length === 0) {
            return { success: true, data: [] };
        }

        const workspaceIds = memberships.map((m) => m.workspace_id);

        // Get workspace details
        const { data: workspaces, error: workspaceError } = await supabase
            .from("workspaces")
            .select("*")
            .in("id", workspaceIds);

        if (workspaceError) {
            logger.error("Failed to fetch workspaces", workspaceError, {
                action: "getWorkspacesData",
                userId,
            });
            return {
                success: false,
                error: createSafeError("Failed to fetch workspaces.", logger.correlationId),
            };
        }

        return { success: true, data: (workspaces as Workspace[]) || [] };

    } catch (error) {
        logger.error("Unexpected error in getWorkspacesData", error as Error, {
            action: "getWorkspacesData",
        });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}
