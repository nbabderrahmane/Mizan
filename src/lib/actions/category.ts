"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger, createSafeError } from "@/lib/logger";
import {
    createCategorySchema,
    updateCategorySchema,
    createSubcategorySchema,
    updateSubcategorySchema,
} from "@/lib/validations/category";
import { revalidatePath } from "next/cache";

export type CategoryResult<T = unknown> = {
    success: boolean;
    data?: T;
    error?: { message: string; correlationId: string };
};

export type Category = {
    id: string;
    workspace_id: string;
    name: string;
    type?: "income" | "expense" | "transfer" | null;
    sort_order: number;
    created_at: string;
};

export type Subcategory = {
    id: string;
    workspace_id: string;
    category_id: string;
    name: string;
    created_at: string;
};

export type CategoryWithSubcategories = Category & {
    subcategories: Subcategory[];
};

/**
 * Create a new category.
 * Only OWNER/MANAGER can create categories.
 */
export async function createCategory(
    workspaceId: string,
    formData: FormData
): Promise<CategoryResult<Category>> {
    const logger = createLogger();
    logger.info("createCategory action started", { action: "createCategory", workspaceId });

    try {
        const rawData = {
            name: formData.get("name") as string,
            type: formData.get("type") as string,
            sort_order: parseInt(formData.get("sort_order") as string) || 0,
        };

        const validatedData = createCategorySchema.parse(rawData);
        logger.debug("Input validated", { action: "createCategory" });

        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.error("User not authenticated", userError ? new Error(userError.message) : undefined, {
                action: "createCategory",
            });
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Check permissions
        const { data: canManage } = await supabase.rpc("can_manage_workspace", {
            ws_id: workspaceId,
        });

        if (!canManage) {
            logger.warn("User cannot manage workspace", {
                action: "createCategory",
                userId: user.id,
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("You don't have permission to create categories.", logger.correlationId),
            };
        }

        const { data: category, error: insertError } = await supabase
            .from("categories")
            .insert({
                workspace_id: workspaceId,
                name: validatedData.name,
                type: validatedData.type,
                sort_order: validatedData.sort_order,
            })
            .select()
            .single();

        if (insertError) {
            logger.error("Failed to create category", new Error(insertError.message), {
                action: "createCategory",
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("Failed to create category.", logger.correlationId),
            };
        }

        logger.info("Category created successfully", {
            action: "createCategory",
            userId: user.id,
            workspaceId,
            categoryId: category.id,
        });

        revalidatePath(`/w/${workspaceId}/categories`);
        return { success: true, data: category };
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            logger.warn("Validation failed", { action: "createCategory" });
            return {
                success: false,
                error: createSafeError("Please check your input.", logger.correlationId),
            };
        }

        logger.error("Unexpected error", error as Error, { action: "createCategory" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Update a category.
 */
export async function updateCategory(
    categoryId: string,
    formData: FormData
): Promise<CategoryResult<Category>> {
    const logger = createLogger();
    logger.info("updateCategory action started", { action: "updateCategory", categoryId });

    try {
        const rawData: Record<string, unknown> = {};
        const name = formData.get("name");
        const type = formData.get("type");
        const sortOrder = formData.get("sort_order");

        if (name) rawData.name = name;
        if (type) rawData.type = type;
        if (sortOrder) rawData.sort_order = parseInt(sortOrder as string);

        const validatedData = updateCategorySchema.parse(rawData);

        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        const { data: category, error: updateError } = await supabase
            .from("categories")
            .update(validatedData)
            .eq("id", categoryId)
            .select()
            .single();

        if (updateError) {
            logger.error("Failed to update category", new Error(updateError.message), {
                action: "updateCategory",
                categoryId,
            });
            return {
                success: false,
                error: createSafeError("Failed to update category.", logger.correlationId),
            };
        }

        logger.info("Category updated", { action: "updateCategory", categoryId });

        revalidatePath(`/w/${category.workspace_id}/categories`);
        return { success: true, data: category };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "updateCategory" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Delete a category.
 * Fails if category has subcategories.
 */
export async function deleteCategory(categoryId: string): Promise<CategoryResult<void>> {
    const logger = createLogger();
    logger.info("deleteCategory action started", { action: "deleteCategory", categoryId });

    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Check for subcategories
        const { count } = await supabase
            .from("subcategories")
            .select("*", { count: "exact", head: true })
            .eq("category_id", categoryId);

        if (count && count > 0) {
            logger.warn("Cannot delete category with subcategories", {
                action: "deleteCategory",
                categoryId,
            });
            return {
                success: false,
                error: createSafeError(
                    "Cannot delete category with subcategories. Delete subcategories first.",
                    logger.correlationId
                ),
            };
        }

        // Get workspace for revalidation
        const { data: category } = await supabase
            .from("categories")
            .select("workspace_id")
            .eq("id", categoryId)
            .single();

        const { error: deleteError } = await supabase
            .from("categories")
            .delete()
            .eq("id", categoryId);

        if (deleteError) {
            logger.error("Failed to delete category", new Error(deleteError.message), {
                action: "deleteCategory",
                categoryId,
            });
            return {
                success: false,
                error: createSafeError("Failed to delete category.", logger.correlationId),
            };
        }

        logger.info("Category deleted", { action: "deleteCategory", categoryId });

        if (category) {
            revalidatePath(`/w/${category.workspace_id}/categories`);
        }
        return { success: true };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "deleteCategory" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * List all categories with subcategories.
 */
export async function listCategories(
    workspaceId: string
): Promise<CategoryResult<CategoryWithSubcategories[]>> {
    const logger = createLogger();
    logger.debug("listCategories action started", { action: "listCategories", workspaceId });

    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Get categories
        const { data: categories, error: catError } = await supabase
            .from("categories")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("sort_order", { ascending: true });

        if (catError) {
            logger.error("Failed to fetch categories", new Error(catError.message), {
                action: "listCategories",
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("Failed to load categories.", logger.correlationId),
            };
        }

        // Get all subcategories for this workspace
        const { data: subcategories, error: subError } = await supabase
            .from("subcategories")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });

        if (subError) {
            logger.error("Failed to fetch subcategories", new Error(subError.message), {
                action: "listCategories",
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("Failed to load subcategories.", logger.correlationId),
            };
        }

        // Group subcategories by category
        const categoriesWithSubs: CategoryWithSubcategories[] = (categories || []).map((cat) => ({
            ...cat,
            subcategories: (subcategories || []).filter((sub) => sub.category_id === cat.id),
        }));

        logger.debug("Categories fetched", {
            action: "listCategories",
            workspaceId,
            count: categoriesWithSubs.length,
        });

        return { success: true, data: categoriesWithSubs };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "listCategories" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Create a subcategory.
 */
export async function createSubcategory(
    workspaceId: string,
    formData: FormData
): Promise<CategoryResult<Subcategory>> {
    const logger = createLogger();
    logger.info("createSubcategory action started", { action: "createSubcategory", workspaceId });

    try {
        const rawData = {
            name: formData.get("name") as string,
            category_id: formData.get("category_id") as string,
        };

        const validatedData = createSubcategorySchema.parse(rawData);

        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Check permissions
        const { data: canManage } = await supabase.rpc("can_manage_workspace", {
            ws_id: workspaceId,
        });

        if (!canManage) {
            return {
                success: false,
                error: createSafeError("You don't have permission.", logger.correlationId),
            };
        }

        const { data: subcategory, error: insertError } = await supabase
            .from("subcategories")
            .insert({
                workspace_id: workspaceId,
                category_id: validatedData.category_id,
                name: validatedData.name,
            })
            .select()
            .single();

        if (insertError) {
            logger.error("Failed to create subcategory", new Error(insertError.message), {
                action: "createSubcategory",
                workspaceId,
            });
            return {
                success: false,
                error: createSafeError("Failed to create subcategory.", logger.correlationId),
            };
        }

        logger.info("Subcategory created", {
            action: "createSubcategory",
            userId: user.id,
            subcategoryId: subcategory.id,
        });

        revalidatePath(`/w/${workspaceId}/categories`);
        return { success: true, data: subcategory };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "createSubcategory" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Update a subcategory.
 */
export async function updateSubcategory(
    subcategoryId: string,
    formData: FormData
): Promise<CategoryResult<Subcategory>> {
    const logger = createLogger();
    logger.info("updateSubcategory action started", { action: "updateSubcategory", subcategoryId });

    try {
        const rawData: Record<string, unknown> = {};
        const name = formData.get("name");
        if (name) rawData.name = name;

        const validatedData = updateSubcategorySchema.parse(rawData);

        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        const { data: subcategory, error: updateError } = await supabase
            .from("subcategories")
            .update(validatedData)
            .eq("id", subcategoryId)
            .select()
            .single();

        if (updateError) {
            logger.error("Failed to update subcategory", new Error(updateError.message), {
                action: "updateSubcategory",
                subcategoryId,
            });
            return {
                success: false,
                error: createSafeError("Failed to update subcategory.", logger.correlationId),
            };
        }

        logger.info("Subcategory updated", { action: "updateSubcategory", subcategoryId });

        revalidatePath(`/w/${subcategory.workspace_id}/categories`);
        return { success: true, data: subcategory };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "updateSubcategory" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Delete a subcategory.
 * Fails if subcategory has transactions or budgets.
 */
export async function deleteSubcategory(subcategoryId: string): Promise<CategoryResult<void>> {
    const logger = createLogger();
    logger.info("deleteSubcategory action started", { action: "deleteSubcategory", subcategoryId });

    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Check for transactions
        const { count: txCount } = await supabase
            .from("transactions")
            .select("*", { count: "exact", head: true })
            .eq("subcategory_id", subcategoryId);

        if (txCount && txCount > 0) {
            return {
                success: false,
                error: createSafeError(
                    "Cannot delete subcategory with transactions.",
                    logger.correlationId
                ),
            };
        }

        // Get workspace for revalidation
        const { data: subcategory } = await supabase
            .from("subcategories")
            .select("workspace_id")
            .eq("id", subcategoryId)
            .single();

        const { error: deleteError } = await supabase
            .from("subcategories")
            .delete()
            .eq("id", subcategoryId);

        if (deleteError) {
            logger.error("Failed to delete subcategory", new Error(deleteError.message), {
                action: "deleteSubcategory",
                subcategoryId,
            });
            return {
                success: false,
                error: createSafeError("Failed to delete subcategory.", logger.correlationId),
            };
        }

        logger.info("Subcategory deleted", { action: "deleteSubcategory", subcategoryId });

        if (subcategory) {
            revalidatePath(`/w/${subcategory.workspace_id}/categories`);
        }
        return { success: true };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "deleteSubcategory" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}

/**
 * Seed default categories for a new workspace (Quick Setup).
 */
export async function seedDefaultCategories(workspaceId: string): Promise<CategoryResult<void>> {
    const logger = createLogger();
    logger.info("seedDefaultCategories action started", { action: "seedDefaultCategories", workspaceId });

    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: createSafeError("You must be logged in.", logger.correlationId),
            };
        }

        // Check permissions
        const { data: canManage } = await supabase.rpc("can_manage_workspace", {
            ws_id: workspaceId,
        });

        if (!canManage) {
            return {
                success: false,
                error: createSafeError("You don't have permission.", logger.correlationId),
            };
        }

        // Default categories and subcategories
        const defaultStructure = [
            { name: "Essentials", subs: ["Home", "Food", "Transport", "Health", "Utilities"] },
            { name: "Lifestyle", subs: ["Entertainment", "Shopping", "Holidays", "Hobbies", "Other"] },
            { name: "Income", subs: ["Salary", "Freelance", "Dividends", "Gifts", "Refunds"] },
            { name: "Savings", subs: ["Emergency Fund", "Investments", "Projects", "Retirement"] },
        ];

        for (let i = 0; i < defaultStructure.length; i++) {
            const cat = defaultStructure[i];

            // Create category
            const { data: category, error: catError } = await supabase
                .from("categories")
                .insert({
                    workspace_id: workspaceId,
                    name: cat.name,
                    sort_order: i,
                })
                .select()
                .single();

            if (catError || !category) {
                logger.error("Failed to create default category", new Error(catError?.message || "Unknown"), {
                    action: "seedDefaultCategories",
                    categoryName: cat.name,
                });
                continue;
            }

            // Create subcategories
            for (const subName of cat.subs) {
                await supabase.from("subcategories").insert({
                    workspace_id: workspaceId,
                    category_id: category.id,
                    name: subName,
                });
            }
        }

        logger.info("Default categories seeded", {
            action: "seedDefaultCategories",
            workspaceId,
        });

        revalidatePath(`/w/${workspaceId}/categories`);
        return { success: true };
    } catch (error) {
        logger.error("Unexpected error", error as Error, { action: "seedDefaultCategories" });
        return {
            success: false,
            error: createSafeError("An unexpected error occurred.", logger.correlationId),
        };
    }
}
