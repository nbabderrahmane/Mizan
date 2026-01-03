import { z } from "zod";

export const createCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Category name is required")
        .max(100, "Category name is too long")
        .trim(),
    type: z.enum(["income", "expense"]).optional().nullable(),
    sort_order: z.number().int().default(0),
});

export const updateCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Category name is required")
        .max(100, "Category name is too long")
        .trim()
        .optional(),
    type: z.enum(["income", "expense"]).optional().nullable(),
    sort_order: z.number().int().optional(),
});

export const createSubcategorySchema = z.object({
    name: z
        .string()
        .min(1, "Subcategory name is required")
        .max(100, "Subcategory name is too long")
        .trim(),
    category_id: z.string().uuid("Invalid category ID"),
});

export const updateSubcategorySchema = z.object({
    name: z
        .string()
        .min(1, "Subcategory name is required")
        .max(100, "Subcategory name is too long")
        .trim()
        .optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;
