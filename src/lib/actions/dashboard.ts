"use server";

import { getCachedBalanceHistory } from "@/lib/data/dashboard-cached";

export async function getBalanceHistoryAction(
    workspaceId: string,
    range: "7d" | "30d" | "90d" | "1y" | "mtd",
    accountId?: string
) {
    try {
        const data = await getCachedBalanceHistory(workspaceId, range, accountId);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching balance history:", error);
        return { success: false, error: "Failed to fetch balance history" };
    }
}
