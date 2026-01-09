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
export const getCachedBalanceHistory = unstable_cache(
    async (
        workspaceId: string,
        range: "7d" | "30d" | "90d" | "1y" | "mtd" = "30d",
        accountId?: string
    ): Promise<{ date: string; balance: number }[]> => {
        // Use Admin Client inside cache scope
        const adminClient = createAdminClient();
        return fetchBalanceHistory(workspaceId, range, accountId, adminClient);
    },
    ['balance-history'],
    {
        revalidate: 300,
        tags: ['dashboard', 'balance'],
    }
);
