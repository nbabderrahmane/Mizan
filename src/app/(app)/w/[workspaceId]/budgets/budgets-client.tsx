"use client";

import { useState } from "react";
import { Plus, PiggyBank, CreditCard, MoreHorizontal, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BudgetWithConfigs } from "@/lib/validations/budget";
import { CreateBudgetWizard } from "@/components/budgets/create-budget-wizard";
import { deleteBudget } from "@/lib/actions/budget";
import { useToast } from "@/hooks/use-toast"; // assuming hook exists, otherwise use standard window.confirm for MVP
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

interface BudgetsClientProps {
    workspaceId: string;
    initialBudgets: BudgetWithConfigs[];
    categories: any[];
    accounts?: any[];
}

export function BudgetsClient({ workspaceId, initialBudgets, categories, accounts = [] }: BudgetsClientProps) {
    const [budgets, setBudgets] = useState(initialBudgets);
    const [showWizard, setShowWizard] = useState(false);
    const { toast } = useToast();

    const handleDelete = async (budgetId: string) => {
        console.log("handleDelete triggered for:", budgetId);
        if (!confirm("Are you sure you want to delete this budget? This will remove all associated configurations and plans.")) {
            console.log("Delete cancelled by user");
            return;
        }

        console.log("Calling deleteBudget server action...");
        try {
            const res = await deleteBudget(workspaceId, budgetId);
            console.log("deleteBudget result:", res);

            if (res.success) {
                setBudgets(budgets.filter(b => b.id !== budgetId));
                toast({ title: "Budget deleted", description: "The budget has been successfully removed." });
            } else {
                console.error("Delete failed:", res.error);
                toast({ title: "Error", description: res.error?.message || "Failed to delete budget", variant: "destructive" });
            }
        } catch (e) {
            console.error("Exception in handleDelete:", e);
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        }
    };

    // Group budgets by Category
    const grouped = budgets.reduce((acc, budget) => {
        const catName = budget.subcategory?.category?.name || "Uncategorized";
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
                    <h1 className="text-3xl font-bold tracking-tight">Budgets & Plans</h1>
                    <p className="text-muted-foreground">
                        Manage your monthly spending caps and long-term financial plans key categories.
                    </p>
                </div>
                <Button onClick={() => setShowWizard(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Budget
                </Button>
            </div>

            <div className="space-y-8">
                {sortedGroups.map((group) => (
                    <CategorySection
                        key={group.categoryName}
                        group={group}
                        onDelete={handleDelete}
                    />
                ))}

                {sortedGroups.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
                        <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">No Budgets Yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">Start by creating a budget for your expenses or goals.</p>
                        <Button variant="outline" onClick={() => setShowWizard(true)}>
                            Create Your First Budget
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
                onSuccess={(newBudget) => {
                    setBudgets([newBudget, ...budgets]);
                    setShowWizard(false);
                }}
            />
        </div>
    );
}

function CategorySection({ group, onDelete }: { group: { categoryName: string, items: BudgetWithConfigs[], totalBudget: number, totalReserved: number }, onDelete: (id: string) => void }) {
    // Determine the primary currency for display from the first item (heuristic)
    const displayCurrency = group.items[0]?.currency || 'USD';

    return (
        <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border">
            <div className="bg-muted/30 p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg">{group.categoryName}</h3>
                    <p className="text-xs text-muted-foreground">
                        {group.items.length} budgets · Total Planned: {new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(group.totalBudget)}
                    </p>
                </div>
                <div className="w-1/3 max-w-[200px] space-y-1">
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase">
                        <span>Allocated</span>
                        <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency, compactDisplay: "short", notation: "compact" }).format(group.totalReserved)} / {new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency, compactDisplay: "short", notation: "compact" }).format(group.totalBudget)}</span>
                    </div>
                    <Progress value={(group.totalReserved / group.totalBudget) * 100} className="h-2" />
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px]">Subcategory / Name</TableHead>
                        <TableHead className="w-[100px]">Strategy</TableHead>
                        <TableHead className="w-[200px]">Progress</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {group.items.map(budget => (
                        <BudgetRow key={budget.id} budget={budget} onDelete={onDelete} />
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
}

function BudgetRow({ budget, onDelete }: { budget: BudgetWithConfigs, onDelete: (id: string) => void }) {
    const isPAYG = budget.type === "PAYG";
    const reserved = budget.current_reserved || 0;

    // Safety check for weird array returns from Supabase
    const paygConfig = Array.isArray(budget.payg_config) ? budget.payg_config[0] : budget.payg_config;
    const planConfig = Array.isArray(budget.plan_config) ? budget.plan_config[0] : budget.plan_config;

    // Safety check for corrupt budgets (missing config)
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
                        <span>Configuration missing. Please delete and recreate.</span>
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => onDelete(budget.id)}
                            >
                                Archive / Delete
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
                        Direct Spend
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-green-600 bg-green-50/50 hover:bg-green-50 border-green-200">
                        Plan & Spend
                    </Badge>
                )}
            </TableCell>
            <TableCell>
                {isPAYG ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 w-0" /> {/* TODO: Connect real spend */}
                        </div>
                        <span className="whitespace-nowrap">Cap Only</span>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <Progress value={progress} className="h-2 bg-green-100 [&>div]:bg-green-500" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{Math.round(progress)}% Funded</span>
                            {planConfig?.due_date && (
                                <span>Due {planConfig.due_date}</span>
                            )}
                        </div>
                    </div>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="font-bold font-mono">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(target || 0)}
                </div>
                {!isPAYG && reserved < (target || 0) && (
                    <div className="text-[10px] text-amber-600 flex items-center justify-end gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Needs {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((target || 0) - reserved)}
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
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit Budget</DropdownMenuItem>
                        <DropdownMenuItem>View Transactions</DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => onDelete(budget.id)}
                        >
                            Archive / Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}
