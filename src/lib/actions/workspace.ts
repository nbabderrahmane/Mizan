"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { createWorkspaceSchema } from "@/lib/validations/workspace";
import { revalidatePath } from "next/cache";

export type WorkspaceResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

export type Workspace = {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
};

export type WorkspaceMember = {
    workspace_id: string;
    user_id: string;
    role: "OWNER" | "MANAGER" | "CONTRIBUTOR" | "VIEWER";
    joined_at: string;
};

/**
 * Create a new workspace.
 * The creator is automatically added as OWNER via database trigger.
 */
export async function createWorkspace(
    formData: FormData
): Promise<WorkspaceResult<Workspace>> {
    const logger = createLogger();
    logger.info("createWorkspace action started", { action: "createWorkspace" });

    try {
        const rawData = {
            name: formData.get("name") as string,
        };

        // Validate input
        const validatedData = createWorkspaceSchema.parse(rawData);
        logger.debug("Input validated", { action: "createWorkspace" });

        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.error("User not authenticated", userError || undefined, {
                action: "createWorkspace",
            });
            return {
                success: false,
                error: createSafeError(
                    "You must be logged in to create a workspace.",
                    logger.correlationId
                ),
            };
        }

        logger.debug("User authenticated", {
            action: "createWorkspace",
            userId: user.id,
        });

        // Create workspace using SECURITY DEFINER function
        // This bypasses RLS since auth.uid() doesn't work correctly in RLS context
        const { data: workspaceId, error: rpcError } = await supabase.rpc(
            "create_workspace_for_user",
            {
                p_name: validatedData.name,
                p_user_id: user.id,
            }
        );

        if (rpcError) {
            logger.error("Failed to create workspace via RPC", rpcError, {
                action: "createWorkspace",
                userId: user.id,
            });
            return {
                success: false,
                error: createSafeError(
                    "Failed to create workspace. Please try again.",
                    logger.correlationId
                ),
            };
        }

        // Fetch the created workspace
        const { data: workspace, error: fetchError } = await supabase
            .from("workspaces")
            .select()
            .eq("id", workspaceId)
            .single();

        if (fetchError || !workspace) {
            logger.error("Failed to fetch created workspace", fetchError ? new Error(fetchError.message) : undefined, {
                action: "createWorkspace",
                userId: user.id,
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError(
                    "Workspace created but failed to load. Please refresh.",
                    logger.correlationId
                ),
            };
        }

        logger.info("Workspace created successfully", {
            action: "createWorkspace",
            userId: user.id,
            workspaceId: workspace.id,
        });

        // Create audit log
        await supabase.rpc("create_audit_log", {
            p_workspace_id: workspace.id,
            p_action: "create",
            p_entity_type: "workspace",
            p_entity_id: workspace.id,
            p_payload_public: { name: workspace.name },
        });

        revalidatePath("/", "layout");
        return { success: true, data: workspace };
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            logger.warn("Validation failed in createWorkspace", {
                action: "createWorkspace",
            });
            return {
                success: false,
                error: createSafeError(
                    "Please provide a valid workspace name.",
                    logger.correlationId
                ),
            };
        }

        logger.error("Unexpected error in createWorkspace", error as Error, {
            action: "createWorkspace",
        });
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
 * List all workspaces the current user is a member of.
 */
export async function listWorkspacesForUser(): Promise<
    WorkspaceResult<Workspace[]>
> {
    const logger = createLogger();
    logger.info("listWorkspacesForUser action started", {
        action: "listWorkspacesForUser",
    });

    try {
        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.warn("User not authenticated", { action: "listWorkspacesForUser" });
            return {
                success: false,
                error: createSafeError(
                    "You must be logged in to view workspaces.",
                    logger.correlationId
                ),
            };
        }

        // Get workspaces where user is a member
        const { data: memberships, error: memberError } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", user.id);

        if (memberError) {
            logger.error("Failed to fetch memberships", memberError, {
                action: "listWorkspacesForUser",
                userId: user.id,
            });
            return {
                success: false,
                error: createSafeError(
                    "Failed to fetch workspaces.",
                    logger.correlationId
                ),
            };
        }

        if (!memberships || memberships.length === 0) {
            logger.debug("User has no workspaces", {
                action: "listWorkspacesForUser",
                userId: user.id,
            });
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
                action: "listWorkspacesForUser",
                userId: user.id,
            });
            return {
                success: false,
                error: createSafeError(
                    "Failed to fetch workspaces.",
                    logger.correlationId
                ),
            };
        }

        logger.info("Fetched workspaces successfully", {
            action: "listWorkspacesForUser",
            userId: user.id,
            count: workspaces?.length || 0,
        });

        return { success: true, data: workspaces || [] };
    } catch (error) {
        logger.error("Unexpected error in listWorkspacesForUser", error as Error, {
            action: "listWorkspacesForUser",
        });
        return {
            success: false,
            error: createSafeError(
                "An unexpected error occurred.",
                logger.correlationId
            ),
        };
    }
}

/**
 * Get a workspace by ID (if user is a member).
 */
export async function getWorkspace(
    workspaceId: string
): Promise<WorkspaceResult<Workspace>> {
    const logger = createLogger();
    logger.debug("getWorkspace action started", {
        action: "getWorkspace",
        workspaceId,
    });

    try {
        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.warn("User not authenticated", { action: "getWorkspace" });
            return {
                success: false,
                error: createSafeError(
                    "You must be logged in.",
                    logger.correlationId
                ),
            };
        }

        // Get workspace (RLS will ensure user is a member)
        const { data: workspace, error: workspaceError } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", workspaceId)
            .single();

        if (workspaceError) {
            logger.warn("Workspace not found or not accessible", {
                action: "getWorkspace",
                workspaceId,
                userId: user.id,
            });
            return {
                success: false,
                error: createSafeError(
                    "Workspace not found.",
                    logger.correlationId
                ),
            };
        }

        logger.debug("Workspace fetched successfully", {
            action: "getWorkspace",
            workspaceId,
            userId: user.id,
        });

        return { success: true, data: workspace };
    } catch (error) {
        logger.error("Unexpected error in getWorkspace", error as Error, {
            action: "getWorkspace",
            workspaceId,
        });
        return {
            success: false,
            error: createSafeError(
                "An unexpected error occurred.",
                logger.correlationId
            ),
        };
    }
}

/**
 * Get the current user's role in a workspace.
 */
export async function getUserWorkspaceRole(
    workspaceId: string
): Promise<WorkspaceResult<WorkspaceMember["role"] | null>> {
    const logger = createLogger();
    logger.debug("getUserWorkspaceRole action started", {
        action: "getUserWorkspaceRole",
        workspaceId,
    });

    try {
        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.warn("User not authenticated", { action: "getUserWorkspaceRole" });
            return { success: true, data: null };
        }

        // Get membership
        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (memberError || !membership) {
            logger.debug("User is not a member of workspace", {
                action: "getUserWorkspaceRole",
                workspaceId,
                userId: user.id,
            });
            return { success: true, data: null };
        }

        logger.debug("User role fetched", {
            action: "getUserWorkspaceRole",
            workspaceId,
            userId: user.id,
            role: membership.role,
        });

        return { success: true, data: membership.role };
    } catch (error) {
        logger.error("Unexpected error in getUserWorkspaceRole", error as Error, {
            action: "getUserWorkspaceRole",
            workspaceId,
        });
        return {
            success: false,
            error: createSafeError(
                "An unexpected error occurred.",
                logger.correlationId
            ),
        };
    }
}
