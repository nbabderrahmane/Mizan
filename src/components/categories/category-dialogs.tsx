"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { createCategory, createSubcategory, updateCategory, updateSubcategory } from "@/lib/actions/category";
import type { Category } from "@/lib/actions/category";
import { useTranslations } from "next-intl";

interface CreateCategoryDialogProps {
    workspaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateCategoryDialog({
    workspaceId,
    open,
    onOpenChange,
    onSuccess,
}: CreateCategoryDialogProps) {
    const t = useTranslations("Categories");
    const tTransactions = useTranslations("Transactions");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await createCategory(workspaceId, formData);

        setIsLoading(false);

        if (result.success) {
            onOpenChange(false);
            onSuccess?.();
            setError(null);
        } else {
            setError(result.error?.message || common("error"));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{t("addCategory")}</DialogTitle>
                    <DialogDescription>
                        {t("addCategoryDesc")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t("categoryName")}</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g., Food & Dining"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">{t("transactionType")}</Label>
                        <Select name="type" required>
                            <SelectTrigger>
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="expense">{tTransactions("expense")}</SelectItem>
                                <SelectItem value="income">{tTransactions("income")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {t("typeHint")}
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {common("cancel")}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? common("creating") : common("add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface CreateSubcategoryDialogProps {
    workspaceId: string;
    categoryId: string;
    categories: Category[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateSubcategoryDialog({
    workspaceId,
    categoryId,
    categories,
    open,
    onOpenChange,
    onSuccess,
}: CreateSubcategoryDialogProps) {
    const t = useTranslations("Categories");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await createSubcategory(workspaceId, formData);

        setIsLoading(false);

        if (result.success) {
            onOpenChange(false);
            onSuccess?.();
            setError(null);
        } else {
            setError(result.error?.message || common("error"));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{t("addSubcategory")}</DialogTitle>
                    <DialogDescription>
                        {t("addSubcategoryDesc")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t("subcategoryName")}</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g., Groceries"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">{t("parentCategory")}</Label>
                        <Select name="category_id" defaultValue={categoryId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("selectCategory")} />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {common("cancel")}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? common("creating") : common("add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface EditCategoryDialogProps {
    workspaceId: string;
    category: Category;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditCategoryDialog({
    workspaceId,
    category,
    open,
    onOpenChange,
    onSuccess,
}: EditCategoryDialogProps) {
    const t = useTranslations("Categories");
    const tTransactions = useTranslations("Transactions");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await updateCategory(category.id, formData);

        setIsLoading(false);

        if (result.success) {
            onOpenChange(false);
            onSuccess?.();
            setError(null);
        } else {
            setError(result.error?.message || common("error"));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{t("editCategory")}</DialogTitle>
                    <DialogDescription>
                        {t("editCategoryDesc")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">{t("categoryName")}</Label>
                        <Input
                            id="edit-name"
                            name="name"
                            defaultValue={category.name}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-type">{t("transactionType")}</Label>
                        <Select name="type" defaultValue={category.type || undefined}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="expense">{tTransactions("expense")}</SelectItem>
                                <SelectItem value="income">{tTransactions("income")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {common("cancel")}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? common("saving") : common("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface EditSubcategoryDialogProps {
    workspaceId: string;
    subcategory: { id: string; name: string };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditSubcategoryDialog({
    workspaceId,
    subcategory,
    open,
    onOpenChange,
    onSuccess,
}: EditSubcategoryDialogProps) {
    const t = useTranslations("Categories");
    const common = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await updateSubcategory(subcategory.id, formData);

        setIsLoading(false);

        if (result.success) {
            onOpenChange(false);
            onSuccess?.();
            setError(null);
        } else {
            setError(result.error?.message || common("error"));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{t("editSubcategory")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-sub-name">{t("subcategoryName")}</Label>
                        <Input
                            id="edit-sub-name"
                            name="name"
                            defaultValue={subcategory.name}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {common("cancel")}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? common("saving") : common("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
