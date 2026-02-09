"use server";

import { getCachedBalanceHistory } from "@/lib/data/dashboard-cached";
import { createClient } from "@/lib/supabase/server";

export async function getBalanceHistoryAction(
    workspaceId: string,
    range: "7d" | "30d" | "90d" | "1y" | "mtd",
    accountId?: string
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify Membership explicitly
        // We do this check here (Call Site) to fail fast.
        const { data: member } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!member) {
            return { success: false, error: "Unauthorized" };
        }

        const data = await getCachedBalanceHistory(workspaceId, user.id, range, accountId);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching balance history:", error);
        if (error instanceof Error && error.message === "Unauthorized") {
            return { success: false, error: "Unauthorized" };
        }
        return { success: false, error: "Failed to fetch balance history" };
    }
}
