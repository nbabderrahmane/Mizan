import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);

export const createTransactionSchema = z.object({
    type: transactionTypeSchema,
    accountId: z.string().uuid("Account is required"),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().min(3).max(3),
    description: z.string().optional(),
    title: z.string().optional(),
    vendor: z.string().optional(),

    // For Expense / Income
    categoryId: z.string().uuid().optional().or(z.literal("")),
    subcategoryId: z.string().uuid().optional().or(z.literal("")),

    // For Transfer
    transferAccountId: z.string().uuid().optional().or(z.literal("")),

    // FX
    fxRate: z.number().positive().optional(),
}).superRefine((data, ctx) => {
    if (data.type === "transfer") {
        if (!data.transferAccountId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Target account is required for transfers",
                path: ["transferAccountId"],
            });
        }
        if (data.transferAccountId === data.accountId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Cannot transfer to the same account",
                path: ["transferAccountId"],
            });
        }
    }
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
