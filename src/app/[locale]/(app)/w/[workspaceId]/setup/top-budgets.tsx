"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { saveTopBudgets } from "@/lib/actions/onboarding";
import { createSafeError } from "@/lib/logger";

interface TopBudgetsProps {
    workspaceId: string;
    onComplete: () => void;
}

// Fixed list of items with hardcoded keys
// Order matches UX requirement
const ITEMS = [
    { key: "salary", defaultRecurring: true },
    { key: "rent", defaultRecurring: true },
    { key: "groceries", defaultRecurring: false }, // Explicitly unchecked
    { key: "utilities", defaultRecurring: true },
    { key: "transport", defaultRecurring: false },
    { key: "eatingOut", defaultRecurring: false },
    { key: "subscriptions", defaultRecurring: true },
    { key: "debt", defaultRecurring: true },
    // { key: "savings", defaultRecurring: true }, // Removed per user request
    { key: "misc", defaultRecurring: false },
];

export function TopBudgets({ workspaceId, onComplete }: TopBudgetsProps) {
    const t = useTranslations("Onboarding");
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state handling manually for simplicity due to dynamic dynamic rows
    const [values, setValues] = useState<Record<string, number | "">>({});
    const [recurring, setRecurring] = useState<Record<string, boolean>>(
        ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: item.defaultRecurring }), {})
    );

    const handleAmountChange = (key: string, val: string) => {
        const num = parseFloat(val);
        setValues(prev => ({
            ...prev,
            [key]: isNaN(num) ? "" : num
        }));
    };

    const handleRecurringChange = (key: string, checked: boolean) => {
        setRecurring(prev => ({
            ...prev,
            [key]: checked
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Transform to API format
            // Only send items with amount > 0
            // Map keys "eatingOut" -> "eating_out" to match backend expectation
            const payload = ITEMS.map(item => {
                const apiKey = item.key === "eatingOut" ? "eating_out" : item.key;
                const amount = Number(values[item.key] || 0);
                return {
                    key: apiKey,
                    amount,
                    recurring: recurring[item.key]
                };
            }).filter(i => i.amount > 0);

            if (payload.length > 0) {
                const result = await saveTopBudgets(workspaceId, payload);
                if (!result.success) {
                    console.error("Failed to save budgets:", result.error);
                }
            }

            onComplete();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t("topBudgetsTitle")}</CardTitle>
                <CardDescription>{t("topBudgetsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%] font-semibold text-foreground">Category</TableHead>
                                <TableHead className="font-semibold text-foreground">Monthly Amount</TableHead>
                                <TableHead className="w-[100px] text-center font-semibold text-foreground">Recurring</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ITEMS.map((item) => (
                                <TableRow key={item.key}>
                                    <TableCell className="font-medium">
                                        {t(item.key)}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number" // Mobile-friendly numeric keyboard
                                            placeholder="0.00"
                                            className="max-w-[150px]"
                                            value={values[item.key] ?? ""}
                                            onChange={(e) => handleAmountChange(item.key, e.target.value)}
                                            inputMode="decimal"
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {/* Salary is income, so "recurring" has different meaning, but logically checkable */}
                                        <Checkbox
                                            checked={recurring[item.key]}
                                            onCheckedChange={(c) => handleRecurringChange(item.key, c as boolean)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-6">
                <Button variant="ghost" onClick={onComplete}>
                    {t("skipForNow")}
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("saveAndContinue")}
                </Button>
            </CardFooter>
        </Card>
    );
}
