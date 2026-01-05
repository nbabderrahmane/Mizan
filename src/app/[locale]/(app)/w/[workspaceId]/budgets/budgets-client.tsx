"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, PiggyBank, CreditCard, MoreHorizontal, AlertCircle, ChevronRight, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BudgetWithConfigs } from "@/lib/validations/budget";
import { CreateBudgetWizard } from "@/components/budgets/create-budget-wizard";
import { EditBudgetDialog } from "@/components/budgets/edit-budget-dialog";
import { deleteBudget } from "@/lib/actions/budget";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, useTranslations } from "next-intl";

interface BudgetsClientProps {
    workspaceId: string;
    initialBudgets: BudgetWithConfigs[];
    categories: any[];
    accounts?: any[];
    workspaceCurrency?: string;
}

export function BudgetsClient({ workspaceId, initialBudgets, categories, accounts = [], workspaceCurrency = "USD" }: BudgetsClientProps) {
    const t = useTranslations("Budgets");
    const common = useTranslations("Common");
    const locale = useLocale();
    const [budgets, setBudgets] = useState(initialBudgets);
    const [showWizard, setShowWizard] = useState(false);
    const [budgetToEdit, setBudgetToEdit] = useState<BudgetWithConfigs | null>(null);
    const { toast } = useToast();

    const handleDelete = async (budgetId: string) => {
        if (!confirm(t("deleteConfirm"))) {
            return;
        }

        try {
            const res = await deleteBudget(workspaceId, budgetId);
            if (res.success) {
                setBudgets(budgets.filter(b => b.id !== budgetId));
                toast({ title: t("deleteBudget"), description: common("success") });
            } else {
                toast({ title: common("error"), description: res.error?.message || common("error"), variant: "destructive" });
            }
        } catch (e) {
            toast({ title: common("error"), description: common("error"), variant: "destructive" });
        }
    };

    // Group budgets by Category
    const grouped = budgets.reduce((acc, budget) => {
        const catName = budget.subcategory?.category?.name || t("uncategorized");
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(budget);
        return acc;
    }, {} as Record<string, BudgetWithConfigs[]>);

    // Convert to array and sort by Total Budget Size (Cap + Target) descending
    const sortedGroups = Object.entries(grouped).map(([categoryName, items]) => {
        const totalBudget = items.reduce((sum, b) => {
            const val = b.type === "PAYG"
                ? (typeof b.payg_config === 'object' && !Array.isArray(b.payg_config) ? b.payg_config?.monthly_cap : 0)
                : (typeof b.plan_config === 'object' && !Array.isArray(b.plan_config) ? b.plan_config?.target_amount : 0);
            return sum + (val || 0);
        }, 0);

        const totalReserved = items.reduce((sum, b) => sum + (b.current_reserved || 0), 0);

        return {
            categoryName,
            items,
            totalBudget,
            totalReserved
        };
    }).sort((a, b) => b.totalBudget - a.totalBudget);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("description")}
                    </p>
                </div>
                <Button onClick={() => setShowWizard(true)}>
                    <Plus className="me-2 h-4 w-4" />
                    {t("createBudget")}
                </Button>
            </div>

            <div className="space-y-8">
                {sortedGroups.map((group) => (
                    <CategorySection
                        key={group.categoryName}
                        group={group}
                        onDelete={handleDelete}
                        onEdit={setBudgetToEdit}
                        workspaceId={workspaceId}
                    />
                ))}

                {sortedGroups.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
                        <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">{t("noBudgets")}</h3>
                        <p className="text-sm text-muted-foreground mb-6">{t("noBudgetsDesc")}</p>
                        <Button variant="outline" onClick={() => setShowWizard(true)}>
                            {t("createFirst")}
                        </Button>
                    </div>
                )}
            </div>

            <CreateBudgetWizard
                open={showWizard}
                setOpen={setShowWizard}
                workspaceId={workspaceId}
                categories={categories}
                accounts={accounts}
                workspaceCurrency={workspaceCurrency}
                onSuccess={(newBudget) => {
                    setBudgets([newBudget, ...budgets]);
                    setShowWizard(false);
                }}
            />

            {budgetToEdit && (
                <EditBudgetDialog
                    budget={budgetToEdit}
                    workspaceId={workspaceId}
                    open={!!budgetToEdit}
                    setOpen={(open) => !open && setBudgetToEdit(null)}
                    onSuccess={(updated) => {
                        setBudgets(budgets.map(b => b.id === updated.id ? updated : b));
                    }}
                />
            )}
        </div>
    );
}

function CategorySection({ group, onDelete, onEdit, workspaceId }: { group: { categoryName: string, items: BudgetWithConfigs[], totalBudget: number, totalReserved: number }, onDelete: (id: string) => void, onEdit: (budget: BudgetWithConfigs) => void, workspaceId: string }) {
    const t = useTranslations("Budgets");
    const locale = useLocale();
    const displayCurrency = group.items[0]?.currency || 'USD';

    return (
        <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border">
            <div className="bg-muted/30 p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg">{group.categoryName}</h3>
                    <p className="text-xs text-muted-foreground">
                        {group.items.length} budgets · {t("totalPlanned")}: {new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(group.totalBudget)}
                    </p>
                </div>
                <div className="w-1/3 max-w-[200px] space-y-1">
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase">
                        <span>{t("allocated")}</span>
                        <span>{new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency, compactDisplay: "short", notation: "compact" }).format(group.totalReserved)} / {new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency, compactDisplay: "short", notation: "compact" }).format(group.totalBudget)}</span>
                    </div>
                    <Progress value={(group.totalReserved / group.totalBudget) * 100} className="h-2" />
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px]">{t("subcategoryName")}</TableHead>
                        <TableHead className="w-[100px]">{t("strategy")}</TableHead>
                        <TableHead className="w-[200px]">{t("progress")}</TableHead>
                        <TableHead className="text-right">{t("amount")}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {group.items.map(budget => (
                        <BudgetRow key={budget.id} budget={budget} onDelete={onDelete} onEdit={onEdit} workspaceId={workspaceId} />
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
}

function BudgetRow({ budget, onDelete, onEdit, workspaceId }: { budget: BudgetWithConfigs, onDelete: (id: string) => void, onEdit: (budget: BudgetWithConfigs) => void, workspaceId: string }) {
    const router = useRouter();
    const t = useTranslations("Budgets");
    const common = useTranslations("Common");
    const locale = useLocale();
    const isPAYG = budget.type === "PAYG";
    const reserved = budget.current_reserved || 0;

    const paygConfig = Array.isArray(budget.payg_config) ? budget.payg_config[0] : budget.payg_config;
    const planConfig = Array.isArray(budget.plan_config) ? budget.plan_config[0] : budget.plan_config;

    if (!isPAYG && !planConfig) {
        return (
            <TableRow className="group opacity-70 bg-destructive/5">
                <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium text-base">{budget.subcategory?.name}</span>
                        <span className="text-xs text-muted-foreground">{budget.name}</span>
                    </div>
                </TableCell>
                <TableCell colSpan={3}>
                    <div className="flex items-center text-destructive text-sm gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t("configMissing")}</span>
                    </div>
                </TableCell>
                <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{common("actions")}</DropdownMenuLabel>
                            <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => onDelete(budget.id)}
                            >
                                {t("deleteBudget")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
        );
    }

    const target = isPAYG ? paygConfig?.monthly_cap : planConfig?.target_amount;
    const progress = target ? Math.min(100, (reserved / target) * 100) : 0;
    const currency = budget.currency || 'USD';

    return (
        <TableRow className="group">
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium text-base">{budget.subcategory?.name}</span>
                    <span className="text-xs text-muted-foreground">{budget.name}</span>
                </div>
            </TableCell>
            <TableCell>
                {isPAYG ? (
                    <Badge variant="outline" className="text-blue-600 bg-blue-50/50 hover:bg-blue-50 border-blue-200">
                        {t("directSpend")}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-green-600 bg-green-50/50 hover:bg-green-50 border-green-200">
                        {t("planSpend")}
                    </Badge>
                )}
            </TableCell>
            <TableCell>
                {isPAYG ? (
                    (() => {
                        const cap = paygConfig?.monthly_cap || 0;
                        const spending = (budget as any).spending_amount || 0;
                        const spendingProgress = cap ? (spending / cap) * 100 : 0;
                        const isOverBudget = spendingProgress > 100;

                        return (
                            <div className="space-y-1.5">
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-blue-400'}`}
                                        style={{ width: `${Math.min(100, spendingProgress)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span className={isOverBudget ? 'text-red-500 font-medium' : ''}>
                                        {Math.round(spendingProgress)}% {t("spent")}
                                    </span>
                                    <span>
                                        {new Intl.NumberFormat(locale, { style: 'currency', currency: budget.currency || 'USD', maximumFractionDigits: 0 }).format(spending)} / {new Intl.NumberFormat(locale, { style: 'currency', currency: budget.currency || 'USD', maximumFractionDigits: 0 }).format(cap)}
                                    </span>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    (() => {
                        const today = new Date().toISOString().slice(0, 10);
                        const isDue = planConfig?.due_date && planConfig.due_date <= today;
                        const spendingAmount = (budget as any).spending_amount || 0;
                        const isPaid = isDue && spendingAmount > 0;

                        if (isPaid) {
                            return (
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-green-500 text-white hover:bg-green-500">
                                        <Check className="h-3 w-3 me-1" />
                                        {t("paid")}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {new Intl.NumberFormat(locale, { style: 'currency', currency: budget.currency || 'USD', maximumFractionDigits: 0 }).format(spendingAmount)}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-1.5">
                                <Progress value={progress} className="h-2 bg-green-100 [&>div]:bg-green-500" />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>{Math.round(progress)}% {t("funded")}</span>
                                    {planConfig?.due_date && (
                                        <span>{t("due")} {planConfig.due_date}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="font-bold font-mono">
                    {new Intl.NumberFormat(locale, { style: 'currency', currency }).format(target || 0)}
                </div>
                {!isPAYG && reserved < (target || 0) && (
                    <div className="text-[10px] text-amber-600 flex items-center justify-end gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {t("needs")} {new Intl.NumberFormat(locale, { style: 'currency', currency }).format((target || 0) - reserved)}
                    </div>
                )}
            </TableCell>
            <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{common("actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEdit(budget)}>{t("editBudget")}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push(`/w/${workspaceId}/transactions?subcategory=${budget.subcategory_id}`)}>
                            {t("viewTransactions")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => onDelete(budget.id)}
                        >
                            {t("deleteBudget")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}
