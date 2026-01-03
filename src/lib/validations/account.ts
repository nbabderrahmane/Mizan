import { z } from "zod";

// Account types
export const accountTypes = ["bank", "cash", "savings", "investment"] as const;
export type AccountType = (typeof accountTypes)[number];

// Common currencies (ISO 4217)
export const commonCurrencies = [
    "USD", "EUR", "GBP", "MAD", "AED", "SAR", "CAD", "CHF", "JPY", "CNY"
] as const;

export const createAccountSchema = z.object({
    name: z
        .string()
        .min(1, "Account name is required")
        .max(100, "Account name is too long")
        .trim(),
    type: z.enum(accountTypes),
    base_currency: z
        .string()
        .length(3, "Currency must be 3 characters (e.g., USD, EUR)")
        .toUpperCase(),
    opening_balance: z
        .number()
        .default(0)
        .or(z.string().transform((val) => parseFloat(val) || 0)),
});

export const updateAccountSchema = z.object({
    name: z
        .string()
        .min(1, "Account name is required")
        .max(100, "Account name is too long")
        .trim()
        .optional(),
    is_archived: z.boolean().optional(),
    opening_balance: z.number().optional().or(z.string().transform((val) => parseFloat(val))).optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
