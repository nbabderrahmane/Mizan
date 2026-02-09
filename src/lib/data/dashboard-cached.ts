import { unstable_cache } from 'next/cache';
import { getDashboardStats as fetchDashboardStats, getBalanceHistory as fetchBalanceHistory, type DashboardStats } from './dashboard';
import { createAdminClient } from '../supabase/admin';

/**
 * Cached version of getDashboardStats.
 * uses Admin Client to bypass cookie requirement in unstable_cache.
 * 
 * Cache is revalidated every 60 seconds.
 */
export const getCachedDashboardStats = unstable_cache(
    async (workspaceId: string): Promise<DashboardStats> => {
        // Use Admin Client inside cache scope (no cookies needed)
        const adminClient = createAdminClient();
        return fetchDashboardStats(workspaceId, adminClient);
    },
    ['dashboard-stats-v3'],
    {
        revalidate: 60,
        tags: ['dashboard'],
    }
);

/**
 * Cached version of getBalanceHistory.
 * uses Admin Client to bypass cookie requirement.
 */
export const getCachedBalanceHistory = async (
    workspaceId: string,
    userId: string,
    range: "7d" | "30d" | "90d" | "1y" | "mtd" = "30d",
    accountId?: string
): Promise<{ date: string; balance: number }[]> => {
    return unstable_cache(
        async () => {
            // Use Admin Client inside cache scope
            const adminClient = createAdminClient();

            // Internal Guardrail: Verify membership
            // This is a defense-in-depth check. The caller should have already checked, but we double-check here.
            // Also ensures cache segregation by userId.
            const { data: member } = await adminClient
                .from("workspace_members")
                .select("user_id")
                .eq("workspace_id", workspaceId)
                .eq("user_id", userId)
                .maybeSingle();

            if (!member) {
                // Throwing here prevents caching the result of an unauthorized attempt
                // and fails the request safeley.
                throw new Error("Unauthorized");
            }

            return fetchBalanceHistory(workspaceId, range, accountId, adminClient);
        },
        ['balance-history', workspaceId, range, accountId ?? 'all'],
        {
            revalidate: 300,
            tags: ['dashboard', 'balance'],
        }
    )();
};
