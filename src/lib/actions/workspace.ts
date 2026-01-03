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
    currency: string;
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

/**
 * Delete a workspace (OWNER only).
 * This will cascade delete all related data.
 */
export async function deleteWorkspace(
    workspaceId: string
): Promise<WorkspaceResult<string | null>> {
    const logger = createLogger();
    logger.info("deleteWorkspace action started", {
        action: "deleteWorkspace",
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
            logger.warn("User not authenticated", { action: "deleteWorkspace" });
            return {
                success: false,
                error: createSafeError(
                    "You must be logged in.",
                    logger.correlationId
                ),
            };
        }

        // Check if user is OWNER
        const { data: membership } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (!membership || membership.role !== "OWNER") {
            logger.warn("User is not workspace owner", {
                action: "deleteWorkspace",
                workspaceId,
                userId: user.id,
            });
            return {
                success: false,
                error: createSafeError(
                    "Only the workspace owner can delete the workspace.",
                    logger.correlationId
                ),
            };
        }

        // Delete workspace (cascade will handle related data)
        const { error: deleteError } = await supabase
            .from("workspaces")
            .delete()
            .eq("id", workspaceId);

        if (deleteError) {
            logger.error("Failed to delete workspace", new Error(deleteError.message), {
                action: "deleteWorkspace",
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError(
                    "Failed to delete workspace.",
                    logger.correlationId
                ),
            };
        }

        // Find another workspace to redirect to
        const { data: remainingWorkspaces } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", user.id)
            .limit(1);

        const nextWorkspaceId = remainingWorkspaces?.[0]?.workspace_id || null;

        logger.info("Workspace deleted successfully", {
            action: "deleteWorkspace",
            userId: user.id,
            workspaceId,
            redirectingTo: nextWorkspaceId,
        });

        revalidatePath("/", "layout");
        return { success: true, data: nextWorkspaceId };
    } catch (error) {
        logger.error("Unexpected error in deleteWorkspace", error as Error, {
            action: "deleteWorkspace",
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
 * Update a workspace (Name, Currency).
 * Only OWNER can update workspace settings.
 */
export async function updateWorkspace(
    workspaceId: string,
    formData: FormData
): Promise<WorkspaceResult<Workspace>> {
    const logger = createLogger();
    logger.info("updateWorkspace action started", { action: "updateWorkspace", workspaceId });

    try {
        const rawData = {
            name: formData.get("name") as string,
            currency: formData.get("currency") as string,
        };

        // Basic validation
        if (!rawData.name || rawData.name.trim().length < 3) {
            return {
                success: false,
                error: createSafeError("Workspace name must be at least 3 characters.", logger.correlationId),
            };
        }

        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Check if user is OWNER
        const { data: membership } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (!membership || membership.role !== "OWNER") {
            return {
                success: false,
                error: createSafeError("Only the workspace owner can update settings.", logger.correlationId),
            };
        }

        // Update workspace
        const { data: workspace, error: updateError } = await supabase
            .from("workspaces")
            .update({
                name: rawData.name,
                currency: rawData.currency,
            })
            .eq("id", workspaceId)
            .select()
            .single();

        if (updateError) {
            logger.error("Failed to update workspace", new Error(updateError.message), {
                action: "updateWorkspace",
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("Failed to update workspace.", logger.correlationId),
            };
        }

        logger.info("Workspace updated successfully", {
            action: "updateWorkspace",
            userId: user.id,
            workspaceId,
        });

        revalidatePath("/", "layout");
        return { success: true, data: workspace };
    } catch (error) {
        logger.error("Unexpected error in updateWorkspace", error as Error, {
            action: "updateWorkspace",
            workspaceId,
        });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}


export type MemberProfile = {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
};

export async function listWorkspaceMembers(
    workspaceId: string
): Promise<WorkspaceResult<MemberProfile[]>> {
    const supabase = await createClient();

    // Check access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: { message: "Not logged in", correlationId: "" } };

    // Verify membership
    const { data: member } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).single();
    if (!member) return { success: false, error: { message: "Access denied", correlationId: "" } };

    // Step 1: Fetch member user_ids
    const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId);

    if (membersError) {
        console.error("listWorkspaceMembers members error:", membersError);
        return { success: false, error: { message: membersError.message, correlationId: "" } };
    }

    if (!membersData || membersData.length === 0) {
        return { success: true, data: [] };
    }

    const userIds = membersData.map(m => m.user_id);

    // Step 2: Fetch profiles for those user_ids
    const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

    if (profilesError) {
        console.error("listWorkspaceMembers profiles error:", profilesError);
        return { success: false, error: { message: profilesError.message, correlationId: "" } };
    }

    // Step 3: Merge data
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

    const members: MemberProfile[] = membersData.map(m => {
        const profile = profilesMap.get(m.user_id);
        return {
            user_id: m.user_id,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
        };
    });

    console.log("listWorkspaceMembers success:", members.length, "members");
    return { success: true, data: members };
}
