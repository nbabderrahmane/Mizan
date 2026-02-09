"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, MoreVertical, Tag, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CategoryWithSubcategories, Subcategory } from "@/lib/actions/category";
import { useTranslations } from "next-intl";
import { getCategoryDisplayName } from "@/lib/utils/category-i18n";

interface CategoryListProps {
    categories: CategoryWithSubcategories[];
    canManage: boolean;
    onAddCategory?: () => void;
    onEditCategory?: (categoryId: string) => void;
    onDeleteCategory?: (categoryId: string) => void;
    onAddSubcategory?: (categoryId: string) => void;
    onEditSubcategory?: (subcategoryId: string) => void;
    onDeleteSubcategory?: (subcategoryId: string) => void;
}

export function CategoryList({
    categories,
    canManage,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    onAddSubcategory,
    onEditSubcategory,
    onDeleteSubcategory,
}: CategoryListProps) {
    const t = useTranslations("Categories");
    const common = useTranslations("Common");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(categories.map((c) => c.id))
    );

    function toggleCategory(categoryId: string) {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    }

    if (categories.length === 0) {
        return (
            <div className="text-center py-12">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">{t("noCategories")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t("noCategoriesDesc")}
                </p>
                {canManage && (
                    <Button className="mt-4" onClick={onAddCategory}>
                        <Plus className="h-4 w-4 me-2" />
                        {t("addCategory")}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {categories.map((category) => (
                <CategoryItem
                    key={category.id}
                    category={category}
                    isExpanded={expandedCategories.has(category.id)}
                    onToggle={() => toggleCategory(category.id)}
                    canManage={canManage}
                    onEdit={() => onEditCategory?.(category.id)}
                    onDelete={() => onDeleteCategory?.(category.id)}
                    onAddSubcategory={() => onAddSubcategory?.(category.id)}
                    onEditSubcategory={onEditSubcategory}
                    onDeleteSubcategory={onDeleteSubcategory}
                />
            ))}
        </div>
    );
}

interface CategoryItemProps {
    category: CategoryWithSubcategories;
    isExpanded: boolean;
    onToggle: () => void;
    canManage: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onAddSubcategory?: () => void;
    onEditSubcategory?: (subcategoryId: string) => void;
    onDeleteSubcategory?: (subcategoryId: string) => void;
}

function CategoryItem({
    category,
    isExpanded,
    onToggle,
    canManage,
    onEdit,
    onDelete,
    onAddSubcategory,
    onEditSubcategory,
    onDeleteSubcategory,
}: CategoryItemProps) {
    const t = useTranslations("Categories");
    const common = useTranslations("Common");
    return (
        <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-3">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 flex-1 text-start"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{getCategoryDisplayName(category, (k) => t(`keys.${k}`))}</span>
                    <Badge variant="secondary" className="text-xs">
                        {category.subcategories.length}
                    </Badge>
                </button>

                {canManage && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onAddSubcategory}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onEdit}>
                                    {common("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    className="text-destructive"
                                >
                                    {common("delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {isExpanded && category.subcategories.length > 0 && (
                <div className="border-t px-3 py-2 space-y-1">
                    {category.subcategories.map((sub) => (
                        <SubcategoryItem
                            key={sub.id}
                            subcategory={sub}
                            canManage={canManage}
                            onEdit={() => onEditSubcategory?.(sub.id)}
                            onDelete={() => onDeleteSubcategory?.(sub.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface SubcategoryItemProps {
    subcategory: Subcategory;
    canManage: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

function SubcategoryItem({
    subcategory,
    canManage,
    onEdit,
    onDelete,
}: SubcategoryItemProps) {
    const t = useTranslations("Categories");
    const common = useTranslations("Common");
    return (
        <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
            <div className="flex items-center gap-2">
                <span className="text-sm">{getCategoryDisplayName(subcategory, (k) => t(`keys.${k}`))}</span>
            </div>

            {canManage && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}>
                            {common("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={onDelete}
                            className="text-destructive"
                        >
                            {common("delete")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
