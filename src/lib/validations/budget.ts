import { z } from "zod";

export const budgetTypeSchema = z.enum(["PAYG", "PLAN_SPEND"]);
export const budgetStatusSchema = z.enum(["active", "paused", "archived"]);
export const budgetRecurrenceSchema = z.enum(["None", "Monthly", "Quarterly", "Semi-annual", "Annual"]);
export const budgetStartPolicySchema = z.enum(["start_this_month", "start_next_month"]);

export const createBudgetSchema = z.object({
    name: z.string().optional(),
    subcategoryId: z.string().uuid("Subcategory ID is required"),
    currency: z.string().min(1, "Currency is required"),
    type: budgetTypeSchema,

    // PAYG
    monthlyCap: z.number().positive().optional(),
    isRecurring: z.boolean().default(false).optional(),

    // Plan & Spend
    targetAmount: z.number().positive().optional(),
    dueDate: z.string().optional(), // ISO date string (YYYY-MM-DD or YYYY-MM)
    recurrence: budgetRecurrenceSchema.optional(),
    startPolicy: budgetStartPolicySchema.optional(),
    allowUseSafe: z.boolean().default(false),
}).refine((data) => {
    if (data.type === "PAYG" && !data.monthlyCap) return false;
    if (data.type === "PLAN_SPEND" && (!data.targetAmount || !data.dueDate)) return false;
    return true;
}, {
    message: "Missing required fields for the selected budget type",
    path: ["type"]
});

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema>;

export type BudgetWithConfigs = {
    id: string;
    workspace_id: string;
    subcategory_id: string;
    name: string;
    currency: string;
    type: "PAYG" | "PLAN_SPEND";
    status: "active" | "paused" | "archived";
    created_at: string;
    updated_at: string;
    subcategory?: { name: string; category?: { name: string } };
    payg_config?: { monthly_cap: number };
    plan_config?: {
        target_amount: number;
        due_date: string;
        recurrence_type: string;
        start_policy: string;
        allow_use_safe: boolean;
        surplus_handling: string;
    };
    current_reserved?: number;
};
