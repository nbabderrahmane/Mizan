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
            currency: formData.get("currency") as string,
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

        // UPDATE CURRENCY
        // The RPC doesn't accept currency, so we update it immediately after creation.
        // The user is the OWNER, so RLS allows update.
        const { error: updateError } = await supabase
            .from("workspaces")
            .update({ currency: validatedData.currency })
            .eq("id", workspaceId);

        if (updateError) {
            // Non-blocking error, log it but proceed (defaults to USD)
            logger.error("Failed to set workspace currency", updateError, {
                action: "createWorkspace",
                workspaceId,
                currency: validatedData.currency
            });
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
            p_payload_public: { name: workspace.name, currency: validatedData.currency },
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
import { getWorkspacesData } from "@/lib/data/workspace";

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

        // Use data layer
        return await getWorkspacesData(supabase, user.id);

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
    email: string;
    role: "OWNER" | "MANAGER" | "CONTRIBUTOR" | "VIEWER";
    joined_at: string;
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

    // Step 1: Fetch members
    const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("user_id, role, joined_at")
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
        .select("id, first_name, last_name, full_name, email")
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
            first_name: profile?.first_name || (profile?.full_name ? profile.full_name.split(' ')[0] : null),
            last_name: profile?.last_name || (profile?.full_name ? profile.full_name.split(' ').slice(1).join(' ') : null),
            email: profile?.email || "",
            role: m.role as MemberProfile["role"],
            joined_at: m.joined_at,
        };
    });

    return { success: true, data: members };
}


/**
 * Get the role of a member in a workspace.
 */
export async function getMemberRole(
    workspaceId: string,
    userId: string
): Promise<WorkspaceResult<WorkspaceMember["role"]>> {
    const logger = createLogger();
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", userId)
            .single();

        if (error) throw error;
        return { success: true, data: data.role as WorkspaceMember["role"] };
    } catch (error) {
        logger.error("Error getting member role", error as Error, {
            action: "getMemberRole",
            workspaceId,
            userId,
        });
        return {
            success: false,
            error: createSafeError(
                "Failed to get member role",
                logger.correlationId
            ),
        };
    }
}

/**
 * Update a member's role (OWNER only).
 */
export async function updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: "OWNER" | "MANAGER" | "CONTRIBUTOR" | "VIEWER"
): Promise<WorkspaceResult> {
    const logger = createLogger();

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: createSafeError("Not authenticated", logger.correlationId) };

        // Permission check: Only OWNER can change roles
        const { data: currentUserMember } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (!currentUserMember || currentUserMember.role !== "OWNER") {
            return { success: false, error: createSafeError("Only the workspace owner can change member roles.", logger.correlationId) };
        }

        // Don't allow changing one's own role
        if (user.id === targetUserId) {
            return { success: false, error: createSafeError("You cannot change your own role.", logger.correlationId) };
        }

        const { error } = await supabase
            .from("workspace_members")
            .update({ role: newRole })
            .eq("workspace_id", workspaceId)
            .eq("user_id", targetUserId);

        if (error) throw error;

        revalidatePath(`/w/${workspaceId}/settings/workspace`);
        revalidatePath(`/w/${workspaceId}/members`);
        return { success: true };

    } catch (error) {
        logger.error("Error updating member role", error as Error, { action: "updateMemberRole" });
        return { success: false, error: createSafeError("Failed to update role", logger.correlationId) };
    }
}

/**
 * Remove a member from workspace.
 */
export async function removeMember(
    workspaceId: string,
    targetUserId: string
): Promise<WorkspaceResult> {
    const logger = createLogger();

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: createSafeError("Not authenticated", logger.correlationId) };

        // Permission check: Only OWNER or the user themselves (to leave)
        const { data: currentUserMember } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (!currentUserMember) return { success: false, error: createSafeError("Permission denied", logger.correlationId) };

        const isRemovingSelf = user.id === targetUserId;
        const isOwner = currentUserMember.role === "OWNER";

        if (!isRemovingSelf && !isOwner) {
            return { success: false, error: createSafeError("Only the workspace owner can remove members.", logger.correlationId) };
        }

        if (isRemovingSelf && isOwner) {
            return { success: false, error: createSafeError("As owner, you must delete the workspace or transfer ownership before leaving.", logger.correlationId) };
        }

        const { error } = await supabase
            .from("workspace_members")
            .delete()
            .eq("workspace_id", workspaceId)
            .eq("user_id", targetUserId);

        if (error) throw error;

        revalidatePath(`/w/${workspaceId}/settings/workspace`);
        revalidatePath(`/w/${workspaceId}/members`);
        revalidatePath("/", "layout");
        return { success: true };

    } catch (error) {
        logger.error("Error removing member", error as Error, { action: "removeMember" });
        return { success: false, error: createSafeError("Failed to remove member", logger.correlationId) };
    }
}
