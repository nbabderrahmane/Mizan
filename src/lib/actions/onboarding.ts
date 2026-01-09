"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import { revalidatePath, revalidateTag } from "next/cache";

export type TopBudgetInput = {
    key: string;      // Canonical key (e.g., 'groceries', 'salary', 'rent')
    amount: number;
    recurring: boolean;
};

// Canonical mapping for subcategories
// Key -> { name, parentCategory }
const CANONICAL_MAP: Record<string, { name: string; parent: string }> = {
    "rent": { name: "Rent / Mortgage", parent: "Essentials" },
    "groceries": { name: "Groceries", parent: "Essentials" },
    "utilities": { name: "Utilities & Internet", parent: "Essentials" },
    "transport": { name: "Transportation", parent: "Essentials" },
    "eating_out": { name: "Eating Out", parent: "Lifestyle" },
    "subscriptions": { name: "Subscriptions", parent: "Lifestyle" },
    "debt": { name: "Debt Payments", parent: "Financial" },
    // "savings" removed
    "misc": { name: "Misc / Buffer", parent: "Misc" },
    // Salary is special, handled separately
};

// Default parent categories if not found (fallback)
const DEFAULT_PARENTS = ["Essentials", "Lifestyle", "Financial", "Misc", "Income"];

export async function saveTopBudgets(workspaceId: string, items: TopBudgetInput[]) {
    const logger = createLogger();
    logger.info("saveTopBudgets action started", { workspaceId });

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Process Salary (Income Baseline)
        const salaryItem = items.find(i => i.key === "salary");
        if (salaryItem && salaryItem.amount > 0) {
            // Update workspace metadata
            // We use RPC or direct update if policy allows. 
            // Assuming we are OWNER, RLS allows update.
            // Fetch current metadata first to merge? Or just use jsonb_set in SQL.
            // Let's simple fetch and update.
            const { data: ws } = await supabase.from("workspaces").select("metadata").eq("id", workspaceId).single();
            const currentMeta = ws?.metadata || {};

            await supabase.from("workspaces").update({
                metadata: {
                    ...currentMeta,
                    income_baseline: salaryItem.amount,
                    income_baseline_currency: "MAD" // TODO: Fetch workspace currency
                }
            }).eq("id", workspaceId);
        }

        // 2. Process Expenses (Budgets)
        const budgetItems = items.filter(i => i.key !== "salary" && i.amount > 0);

        // logger.info(`[Onboarding Debug] Saving ${budgetItems.length} budget items`, { items: budgetItems });

        if (budgetItems.length === 0) {
            return { success: true };
        }

        // Fetch existing categories to map parents
        const { data: categories } = await supabase.from("categories").select("id, name").eq("workspace_id", workspaceId);

        const { data: subcategories } = await supabase.from("subcategories").select("id, name, category_id").eq("workspace_id", workspaceId);

        // Helper to find or create category/subcategory
        const getSubcategoryId = async (key: string): Promise<string | null> => {
            const def = CANONICAL_MAP[key];
            if (!def) {
                logger.warn(`[Onboarding Debug] No canonical definition for key: ${key}`);
                return null;
            }

            // Find valid parent category
            let parentCat = categories?.find(c => c.name.toLowerCase() === def.parent.toLowerCase());

            // If parent doesn't exist, we might need to create it (rare if seeded), but let's be safe
            if (!parentCat) {
                // Try fuzzy match or default
                parentCat = categories?.find(c => c.name.toLowerCase().includes(def.parent.toLowerCase()));
            }

            if (!parentCat) {
                logger.info(`[Onboarding Debug] Parent category ${def.parent} not found. Creating it.`);

                const { data: newParent, error: parentError } = await supabase.from("categories").insert({
                    workspace_id: workspaceId,
                    name: def.parent,
                    type: "expense", // Default to expense
                    sort_order: 99
                }).select().single();

                if (newParent) {
                    parentCat = newParent;
                    // Add to local cache
                    categories?.push(newParent);
                } else {
                    logger.error(`[Onboarding Debug] Failed to create parent category ${def.parent}`, parentError ? new Error(parentError.message) : new Error("Unknown error"));
                    // Fallback to first category as last resort
                    if (categories && categories.length > 0) {
                        parentCat = categories[0];
                    } else {
                        return null;
                    }
                }
            }

            // Find Subcategory by precise name OR fuzzy match
            let sub = subcategories?.find(s =>
                s.category_id === parentCat!.id &&
                (s.name.toLowerCase() === def.name.toLowerCase() || s.name.toLowerCase().includes(def.name.toLowerCase()))
            );

            if (sub) return sub.id;

            // Soft-create Subcategory
            const { data: newSub, error: subError } = await supabase.from("subcategories").insert({
                workspace_id: workspaceId,
                category_id: parentCat!.id,
                name: def.name
                // funding_mode removed as it likely doesn't exist
            }).select().single();

            if (subError) {
                logger.error(`[Onboarding Debug] Failed to create subcategory ${def.name}`, subError);
            }

            // Store in logical cache for this request
            if (newSub) subcategories?.push(newSub);

            return newSub?.id || null;
        };

        for (const item of budgetItems) {
            const subId = await getSubcategoryId(item.key);
            if (!subId) {
                logger.warn(`[Onboarding Debug] Could not resolve subcategory for key ${item.key}`);
                continue;
            }

            // Check if budget exists
            const { data: existingBudget } = await supabase.from("budgets")
                .select("id")
                .eq("workspace_id", workspaceId)
                .eq("subcategory_id", subId)
                .single();

            if (existingBudget) {
                // Update PAYG config
                await supabase.from("budget_payg_configs").upsert({
                    budget_id: existingBudget.id,
                    monthly_cap: item.amount
                });
                // Update metadata for recurring
                await supabase.from("budgets").update({
                    metadata: { recurring: item.recurring }
                }).eq("id", existingBudget.id);
            } else {
                // Create Budget
                const { data: newBudget } = await supabase.from("budgets").insert({
                    workspace_id: workspaceId,
                    subcategory_id: subId,
                    name: CANONICAL_MAP[item.key].name, // or keep null to inherit logic
                    type: "PAYG",
                    status: "active"
                }).select().single();

                if (newBudget) {
                    await supabase.from("budget_payg_configs").insert({
                        budget_id: newBudget.id,
                        monthly_cap: item.amount
                    });
                    await supabase.from("budgets").update({
                        metadata: { recurring: item.recurring }
                    }).eq("id", newBudget.id);
                }
            }
        }

        revalidatePath(`/w/${workspaceId}/dashboard`);
        // Invalidate dashboard stats cache
        revalidateTag("dashboard");
        return { success: true };

    } catch (error) {
        logger.error("Failed to save top budgets", error as Error, { workspaceId });
        return { success: false, error: "Internal Server Error" };
    }
}
