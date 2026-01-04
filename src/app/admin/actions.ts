"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLogger, createSafeError } from "@/lib/logger";

export type AdminResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

export type AdminStats = {
    totalWorkspaces: number;
    totalUsers: number;
    totalProfiles: number;
    newUsersLast7Days: number;
    newWorkspacesLast7Days: number;
    activeWorkspacesLast30Days: number | null; // null if no activity tracking available
    dbStatus: "connected" | "disconnected";
};

export type AdminWorkspace = {
    id: string;
    name: string;
    created_at: string;
    member_count: number;
    owner_email: string;
    created_by_name?: string;
    status?: string | null;
    deleted_at?: string | null;
};

/**
 * Check if the current user has support admin access.
 */
/**
 * Check if the current user has support admin access.
 */
export async function checkAdminAccess() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    console.log("[Admin Check] User ID:", user.id);

    // Check app_admins table directly
    const { data } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("role", "SUPPORT_ADMIN")
        .single();

    const isAdmin = !!data;
    console.log("[Admin Check] Is Admin?", isAdmin);
    return isAdmin;
}

/**
 * Get high-level system stats.
 */
export async function getSystemStats(): Promise<AdminResult<AdminStats>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();
        const now = new Date();
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        const date7DaysAgo = d7.toISOString();

        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const date30DaysAgo = d30.toISOString();

        // 1. Total Workspaces & New Workspaces
        const { count: totalWorkspaces, error: wsError } = await supabase
            .from("workspaces")
            .select("*", { count: "exact", head: true });

        if (wsError) throw wsError;

        const { count: newWorkspaces } = await supabase
            .from("workspaces")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date7DaysAgo);

        // 2. Total Profiles & New Profiles
        const { count: totalProfiles, error: profError } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true });

        if (profError) throw profError;

        const { count: newProfiles } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date7DaysAgo);

        // 3. Active Workspaces (Transaction activity in last 30 days)
        // Definition: has activity in last 30 days if events exist; otherwise skip and show "N/A"
        let activeWorkspacesCount: number | null = null;

        // Check if there are ANY transactions in the system
        console.log("[Stats Debug] Checking total transactions...");
        const { count: totalTransactions, error: cxError } = await supabase
            .from("transactions")
            .select("*", { count: "exact", head: true });

        console.log("[Stats Debug] Total transactions count:", totalTransactions);
        if (cxError) console.error("[Stats Debug] Count error:", cxError);

        if (totalTransactions && totalTransactions > 0) {
            const { data: activeTxWorkspaces, error: actError } = await supabase
                .from("transactions")
                .select("workspace_id")
                .gte("created_at", date30DaysAgo);

            if (!actError && activeTxWorkspaces) {
                const uniqueIds = new Set(activeTxWorkspaces.map(t => t.workspace_id));
                activeWorkspacesCount = uniqueIds.size;
                console.log("[Stats Debug] Active workspaces count:", activeWorkspacesCount);
            } else {
                console.error("[Stats Debug] Active workspaces error:", actError);
                activeWorkspacesCount = 0;
            }
        } else {
            console.log("[Stats Debug] No transactions found (count is 0 or null)");
        }

        // Mock Auth Check (usually always true if we got here)
        const authStatus = "ok";

        return {
            success: true,
            data: {
                totalWorkspaces: totalWorkspaces || 0,
                totalUsers: totalProfiles || 0,
                totalProfiles: totalProfiles || 0,
                newUsersLast7Days: newProfiles || 0,
                newWorkspacesLast7Days: newWorkspaces || 0,
                activeWorkspacesLast30Days: activeWorkspacesCount,
                dbStatus: "connected",
            }
        };

    } catch (error) {
        logger.error("Error fetching system stats", error as Error, { action: "getSystemStats" });
        return {
            success: false,
            error: createSafeError("Failed to fetch stats", logger.correlationId),
        };
    }
}

/**
 * List all workspaces with search and filtering.
 */
export async function listAllWorkspaces(
    limit = 50,
    offset = 0,
    search?: string,
    status?: string
): Promise<AdminResult<{ workspaces: AdminWorkspace[], total: number }>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();

        let query = supabase
            .from("workspaces")
            .select(`
                id,
                name,
                created_at,
                created_by,
                status,
                deleted_at
            `, { count: "exact" });

        if (search) {
            query = query.ilike("name", `%${search}%`);
        }

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        const { data: workspaces, count, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        const enrichedWorkspaces: AdminWorkspace[] = [];

        for (const ws of workspaces) {
            // Get member count
            const { count: memberCount } = await supabase
                .from("workspace_members")
                .select("*", { count: "exact", head: true })
                .eq("workspace_id", ws.id);

            // Get owner email (creator)
            const { data: creator } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", ws.created_by)
                .single();

            enrichedWorkspaces.push({
                id: ws.id,
                name: ws.name,
                created_at: ws.created_at,
                member_count: memberCount || 0,
                owner_email: creator?.email || "Unknown",
                status: ws.status,
                deleted_at: ws.deleted_at
            });
        }

        return { success: true, data: { workspaces: enrichedWorkspaces, total: count || 0 } };

    } catch (error) {
        logger.error("Error listing all workspaces", error as Error, { action: "listAllWorkspaces" });
        return { success: false, error: createSafeError("Failed to list workspaces", logger.correlationId) };
    }
}

/**
 * Suspend a workspace.
 */
export async function suspendWorkspace(workspaceId: string, reason: string): Promise<AdminResult<void>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Update status
        const { error } = await supabase
            .from("workspaces")
            .update({ status: "suspended" })
            .eq("id", workspaceId);

        if (error) throw error;

        // Audit Log
        await supabase.from("audit_logs").insert({
            workspace_id: workspaceId,
            actor_user_id: user!.id,
            action: "admin.suspend_workspace",
            entity_type: "workspace",
            entity_id: workspaceId,
            payload_public: { reason }
        });

        return { success: true };

    } catch (error) {
        logger.error("Error suspending workspace", error as Error, { workspaceId });
        return { success: false, error: createSafeError("Failed to suspend workspace", logger.correlationId) };
    }
}

/**
 * Reactivate a workspace.
 */
export async function reactivateWorkspace(workspaceId: string): Promise<AdminResult<void>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from("workspaces")
            .update({ status: "active" })
            .eq("id", workspaceId);

        if (error) throw error;

        // Audit Log
        await supabase.from("audit_logs").insert({
            workspace_id: workspaceId,
            actor_user_id: user!.id,
            action: "admin.reactivate_workspace",
            entity_type: "workspace",
            entity_id: workspaceId,
            payload_public: {}
        });

        return { success: true };

    } catch (error) {
        logger.error("Error reactivating workspace", error as Error, { workspaceId });
        return { success: false, error: createSafeError("Failed to reactivate workspace", logger.correlationId) };
    }
}

/**
 * Soft-delete a workspace.
 */
export async function softDeleteWorkspace(workspaceId: string, reason: string): Promise<AdminResult<void>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from("workspaces")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", workspaceId);

        if (error) throw error;

        // Audit Log
        await supabase.from("audit_logs").insert({
            workspace_id: workspaceId,
            actor_user_id: user!.id,
            action: "admin.soft_delete_workspace",
            entity_type: "workspace",
            entity_id: workspaceId,
            payload_public: { reason }
        });

        return { success: true };

    } catch (error) {
        logger.error("Error deleting workspace", error as Error, { workspaceId });
        return { success: false, error: createSafeError("Failed to delete workspace", logger.correlationId) };
    }
}

/**
 * Get detailed workspace info.
 */
export async function getWorkspaceDetails(workspaceId: string): Promise<AdminResult<AdminWorkspace & { created_by_name?: string }>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();

        const { data: ws, error } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", workspaceId)
            .single();

        if (error) throw error;

        // Get owner email
        const { data: creator } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", ws.created_by)
            .single();

        // Get member count
        const { count: memberCount } = await supabase
            .from("workspace_members")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", workspaceId);

        return {
            success: true,
            data: {
                id: ws.id,
                name: ws.name,
                created_at: ws.created_at,
                member_count: memberCount || 0,
                owner_email: creator?.email || "Unknown",
                created_by_name: creator?.full_name || undefined,
                status: ws.status,
                deleted_at: ws.deleted_at
            }
        };

    } catch (error) {
        logger.error("Error fetching workspace details", error as Error, { workspaceId });
        return { success: false, error: createSafeError("Failed to fetch workspace", logger.correlationId) };
    }
}

/**
 * Get workspace members for admin.
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<AdminResult<any[]>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();

        // 1. Get members
        const { data: members, error } = await supabase
            .from("workspace_members")
            .select("user_id, role, joined_at")
            .eq("workspace_id", workspaceId);

        if (error) throw error;

        if (!members || members.length === 0) {
            return { success: true, data: [] };
        }

        // 2. Get profiles for these members
        const userIds = members.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds);

        if (profilesError) throw profilesError;

        // 3. Map profiles to members
        const profilesMap = new Map(profiles?.map(p => [p.id, p]));

        const enrichedMembers = members.map(m => {
            const profile = profilesMap.get(m.user_id);
            return {
                user_id: m.user_id,
                role: m.role,
                joined_at: m.joined_at,
                profiles: {
                    email: profile?.email || "Unknown",
                    full_name: profile?.full_name || "Unknown"
                }
            };
        });

        return { success: true, data: enrichedMembers };

    } catch (error) {
        logger.error("Error fetching workspace members", error as Error, { workspaceId });
        return { success: false, error: createSafeError("Failed to fetch members", logger.correlationId) };
    }
}

/**
 * Get workspace activity (audit logs).
 */
export async function getWorkspaceActivity(workspaceId: string, limit = 20): Promise<AdminResult<any[]>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();

        const { data: logs, error } = await supabase
            .from("audit_logs")
            .select("*") // We will join manually below as before
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw error;

        const enrichedLogs = [];
        for (const log of logs) {
            const { data: actor } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", log.actor_user_id)
                .single();

            enrichedLogs.push({
                ...log,
                actor_email: actor?.email || "Unknown"
            });
        }

        return { success: true, data: enrichedLogs };

    } catch (error) {
        logger.error("Error fetching workspace activity", error as Error, { workspaceId });
        return { success: false, error: createSafeError("Failed to fetch activity", logger.correlationId) };
    }
}

/**
 * List all users with search and filtering.
 */
export async function getAdminUsers(
    limit = 50,
    offset = 0,
    search?: string,
    status?: string // 'active' | 'banned'
): Promise<AdminResult<{ users: any[], total: number }>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();

        let query = supabase
            .from("profiles")
            .select("*, last_sign_in_at", { count: "exact", head: false });

        if (search) {
            query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        }

        if (status === "banned") {
            query = query.eq("is_banned", true);
        } else if (status === "active") {
            query = query.eq("is_banned", false);
        }

        const { data: users, count, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return { success: true, data: { users: users || [], total: count || 0 } };

    } catch (error) {
        logger.error("Error listing users", error as Error, { action: "getAdminUsers" });
        return { success: false, error: createSafeError("Failed to list users", logger.correlationId) };
    }
}

/**
 * Ban a user.
 */
export async function banUser(userId: string, reason: string): Promise<AdminResult<void>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();
        const { data: { user: actor } } = await supabase.auth.getUser();

        // Update profile
        const { error } = await supabase
            .from("profiles")
            .update({
                is_banned: true,
                banned_at: new Date().toISOString()
            })
            .eq("id", userId);

        if (error) throw error;

        // Audit Log
        await supabase.from("audit_logs").insert({
            workspace_id: null, // Global action
            actor_user_id: actor!.id,
            action: "admin.ban_user",
            entity_type: "user",
            entity_id: userId,
            payload_public: { reason }
        });

        return { success: true };

    } catch (error) {
        logger.error("Error banning user", error as Error, { userId });
        return { success: false, error: createSafeError("Failed to ban user", logger.correlationId) };
    }
}

/**
 * Unban a user.
 */
export async function unbanUser(userId: string): Promise<AdminResult<void>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();
        const { data: { user: actor } } = await supabase.auth.getUser();

        // Update profile
        const { error } = await supabase
            .from("profiles")
            .update({
                is_banned: false,
                banned_at: null
            })
            .eq("id", userId);

        if (error) throw error;

        // Audit Log
        await supabase.from("audit_logs").insert({
            workspace_id: null,
            actor_user_id: actor!.id,
            action: "admin.unban_user",
            entity_type: "user",
            entity_id: userId,
            payload_public: {}
        });

        return { success: true };

    } catch (error) {
        logger.error("Error unbanning user", error as Error, { userId });
        return { success: false, error: createSafeError("Failed to unban user", logger.correlationId) };
    }
}

/**
 * Get detailed user info for admin.
 */
export async function getAdminUserDetails(userId: string): Promise<AdminResult<any>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();

        // 1. Get profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*, last_sign_in_at")
            .eq("id", userId)
            .single();

        if (profileError) throw profileError;

        // 2. Get workspaces
        const { data: memberships, error: memberError } = await supabase
            .from("workspace_members")
            .select(`
                role,
                joined_at,
                workspaces (
                    id,
                    name,
                    status
                )
            `)
            .eq("user_id", userId);

        if (memberError) throw memberError;

        return {
            success: true,
            data: {
                profile,
                memberships: memberships || []
            }
        };

    } catch (error) {
        logger.error("Error fetching user details", error as Error, { userId });
        return { success: false, error: createSafeError("Failed to fetch user details", logger.correlationId) };
    }
}

/**
 * Get system audit logs with filtering.
 */
export async function getAdminAuditLogs(
    limit = 50,
    offset = 0,
    filters?: {
        action?: string;
        actorId?: string;
        dateFrom?: string;
        dateTo?: string;
    }
): Promise<AdminResult<{ logs: any[], total: number }>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient();

        let query = supabase
            .from("audit_logs")
            .select(`
                *,
                actor:profiles(email, full_name),
                workspace:workspaces(name)
            `, { count: "exact" });

        if (filters?.action && filters.action !== "all") {
            query = query.ilike("action", `%${filters.action}%`);
        }

        if (filters?.actorId) {
            query = query.eq("actor_user_id", filters.actorId);
        }

        if (filters?.dateFrom) {
            query = query.gte("created_at", filters.dateFrom);
        }

        if (filters?.dateTo) {
            query = query.lte("created_at", filters.dateTo);
        }

        const { data: logs, count, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        const flattenedLogs = logs?.map(log => ({
            id: log.id,
            created_at: log.created_at,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            actor_email: log.actor?.email || "Unknown",
            actor_name: log.actor?.full_name || "Unknown",
            workspace_name: log.workspace?.name || "Global",
            payload: log.payload_public
        })) || [];

        return { success: true, data: { logs: flattenedLogs, total: count || 0 } };

    } catch (error) {
        logger.error("Error fetching audit logs", error as Error, { action: "getAdminAuditLogs" });
        return { success: false, error: createSafeError("Failed to fetch audit logs", logger.correlationId) };
    }
}

/**
 * Reset a user's password manually (Admin).
 */
export async function adminResetPassword(userId: string): Promise<AdminResult<string>> {
    const logger = createLogger();
    if (!await checkAdminAccess()) {
        return { success: false, error: createSafeError("Unauthorized access", logger.correlationId) };
    }

    try {
        const supabase = await createClient(); // For auth check (actor)
        const { data: { user: actor } } = await supabase.auth.getUser();

        const adminClient = createAdminClient();

        // Generate random password
        const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "!Aa1";

        // Update user
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) throw updateError;

        // Audit Log
        await supabase.from("audit_logs").insert({
            workspace_id: null, // Global action
            actor_user_id: actor!.id,
            action: "admin.reset_password",
            entity_type: "user",
            entity_id: userId,
            payload_public: { method: "manual_reset" },
            payload_sensitive: { new_password_generated: true }
        });

        return { success: true, data: newPassword };

    } catch (error) {
        logger.error("Error resetting password", error as Error, { userId });
        return { success: false, error: createSafeError("Failed to reset password", logger.correlationId) };
    }
}


