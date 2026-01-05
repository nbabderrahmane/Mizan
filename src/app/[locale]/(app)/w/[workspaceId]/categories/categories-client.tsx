"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryList } from "@/components/categories/category-list";
import {
    CreateCategoryDialog,
    CreateSubcategoryDialog,
    EditCategoryDialog,
    EditSubcategoryDialog
} from "@/components/categories/category-dialogs";
import { deleteCategory, deleteSubcategory } from "@/lib/actions/category";
import type { CategoryWithSubcategories, Category, Subcategory } from "@/lib/actions/category";
import { useTranslations } from "next-intl";

interface CategoriesPageClientProps {
    workspaceId: string;
    categories: CategoryWithSubcategories[];
    canManage: boolean;
}

export function CategoriesPageClient({
    workspaceId,
    categories,
    canManage,
}: CategoriesPageClientProps) {
    const t = useTranslations("Categories");
    const common = useTranslations("Common");
    const router = useRouter();
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

    const [editCategoryOpen, setEditCategoryOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

    const [editSubcategoryOpen, setEditSubcategoryOpen] = useState(false);
    const [subcategoryToEdit, setSubcategoryToEdit] = useState<Subcategory | null>(null);

    function handleAddSubcategory(categoryId: string) {
        setSelectedCategoryId(categoryId);
        setSubcategoryDialogOpen(true);
    }

    function handleEditCategory(categoryId: string) {
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
            setCategoryToEdit(category);
            setEditCategoryOpen(true);
        }
    }

    function handleEditSubcategory(subcategoryId: string) {
        // Flatten subcategories to find the one we need
        const subcategory = categories
            .flatMap((c) => c.subcategories)
            .find((s) => s.id === subcategoryId);

        if (subcategory) {
            setSubcategoryToEdit(subcategory);
            setEditSubcategoryOpen(true);
        }
    }

    async function handleDeleteCategory(categoryId: string) {
        if (!confirm(t("deleteCategoryConfirm"))) return;
        await deleteCategory(categoryId);
        router.refresh();
    }

    async function handleDeleteSubcategory(subcategoryId: string) {
        if (!confirm(t("deleteSubcategoryConfirm"))) return;
        await deleteSubcategory(subcategoryId);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("description")}
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => setCategoryDialogOpen(true)}>
                        <Plus className="h-4 w-4 me-2" />
                        {t("addCategory")}
                    </Button>
                )}
            </div>

            <CategoryList
                categories={categories}
                canManage={canManage}
                onAddCategory={() => setCategoryDialogOpen(true)}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddSubcategory={handleAddSubcategory}
                onEditSubcategory={handleEditSubcategory}
                onDeleteSubcategory={handleDeleteSubcategory}
            />

            {canManage && (
                <>
                    <CreateCategoryDialog
                        workspaceId={workspaceId}
                        open={categoryDialogOpen}
                        onOpenChange={setCategoryDialogOpen}
                        onSuccess={() => router.refresh()}
                    />
                    <CreateSubcategoryDialog
                        workspaceId={workspaceId}
                        categoryId={selectedCategoryId}
                        categories={categories}
                        open={subcategoryDialogOpen}
                        onOpenChange={setSubcategoryDialogOpen}
                        onSuccess={() => router.refresh()}
                    />

                    {categoryToEdit && (
                        <EditCategoryDialog
                            workspaceId={workspaceId}
                            category={categoryToEdit}
                            open={editCategoryOpen}
                            onOpenChange={setEditCategoryOpen}
                            onSuccess={() => {
                                router.refresh();
                                setCategoryToEdit(null);
                            }}
                        />
                    )}

                    {subcategoryToEdit && (
                        <EditSubcategoryDialog
                            workspaceId={workspaceId}
                            subcategory={subcategoryToEdit}
                            open={editSubcategoryOpen}
                            onOpenChange={setEditSubcategoryOpen}
                            onSuccess={() => {
                                router.refresh();
                                setSubcategoryToEdit(null);
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
}
