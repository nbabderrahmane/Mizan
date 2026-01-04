"use client";

import { useMemo, useState, Fragment } from "react";
import {
    Bar,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    ComposedChart,
    Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { ReportData } from "@/lib/data/reports";
import { cn } from "@/lib/utils";

interface ReportsClientProps {
    workspaceId: string;
    initialData: ReportData;
    period: string;
}

export function ReportsClient({ workspaceId, initialData, period }: ReportsClientProps) {
    const router = useRouter();
    const data = initialData;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: data.currency,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const handlePeriodChange = (newPeriod: string) => {
        router.push(`/w/${workspaceId}/reports?period=${newPeriod}`);
    };

    const netGrowth = data.summary.totalIncome > 0
        ? (data.summary.netFlow / data.summary.totalIncome) * 100
        : 0;

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Analytics & Reports</h1>
                    <p className="text-muted-foreground">Monitor your financial performance and trends.</p>
                </div>

                <Tabs value={period} onValueChange={handlePeriodChange} className="w-auto overflow-x-auto">
                    <TabsList className="flex w-max md:grid md:grid-cols-6 md:w-[600px]">
                        <TabsTrigger value="this_month">This Month</TabsTrigger>
                        <TabsTrigger value="last_month">Last Month</TabsTrigger>
                        <TabsTrigger value="3m">Last 3M</TabsTrigger>
                        <TabsTrigger value="6m">Last 6M</TabsTrigger>
                        <TabsTrigger value="12m">Last 12M</TabsTrigger>
                        <TabsTrigger value="all">All Time</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Summary Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(data.summary.totalIncome)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(data.summary.totalExpenses)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Flow</CardTitle>
                        {data.summary.grossFlow >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-bold",
                            data.summary.grossFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {formatCurrency(data.summary.grossFlow)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.summary.totalIncome > 0 ? (data.summary.grossFlow / data.summary.totalIncome * 100).toFixed(1) : "0"}% margin
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Flow (Safe)</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-bold",
                            data.summary.netFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
                        )}>
                            {formatCurrency(data.summary.netFlow)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            After {formatCurrency(data.summary.totalFunding)} provisions
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Main Trend Chart */}
                <Card className="md:col-span-4">
                    <CardHeader>
                        <CardTitle>Income vs Expenses</CardTitle>
                        <CardDescription>Monthly comparison across the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data.monthlyTrends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis
                                        dataKey="label"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => {
                                            if (data.isDaily) {
                                                const d = new Date(val);
                                                return d.getDate().toString();
                                            }
                                            const [y, m] = val.split("-");
                                            return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });
                                        }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => formatCurrency(val).replace(".00", "")}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => formatCurrency(val).replace(".00", "")}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
                                                        <p className="text-sm font-bold">{label}</p>
                                                        <div className="space-y-1">
                                                            {payload.map((entry: any) => (
                                                                <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                        <span className="text-muted-foreground">{entry.name}</span>
                                                                    </div>
                                                                    <span className="font-mono font-medium">{formatCurrency(entry.value)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" />
                                    <Bar yAxisId="left" name="Income" dataKey="income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar yAxisId="left" name="Expenses" dataKey="expenses" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Line yAxisId="right" type="monotone" name="Balance" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                    <Line yAxisId="right" type="monotone" name="Safe Cash" dataKey="safeCash" stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Spending by Category</CardTitle>
                        <CardDescription>Distribution of expenses for the period.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.expenseBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.expenseBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const item = payload[0].payload;
                                                return (
                                                    <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                                                        <span className="font-bold">{item.name}</span>: {formatCurrency(item.value)}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full mt-4 space-y-2">
                            {data.expenseBreakdown.slice(0, 5).map((cat) => (
                                <div key={cat.name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span>{cat.name}</span>
                                    </div>
                                    <span className="font-medium text-muted-foreground">
                                        {((cat.value / data.summary.totalExpenses) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed P&L Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Profit & Loss Details</CardTitle>
                    <CardDescription>Breakdown of charges relative to total revenue.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">% of Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="bg-muted/50 font-semibold">
                                <TableCell>Total Income</TableCell>
                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(data.summary.totalIncome)}
                                </TableCell>
                                <TableCell className="text-right">100%</TableCell>
                            </TableRow>
                            {data.incomeBreakdown.map((cat) => (
                                <Fragment key={cat.name}>
                                    <TableRow className="bg-muted/30 font-semibold group/row">
                                        <TableCell className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                            {cat.name}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatCurrency(cat.value)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground/60 text-xs text-emerald-600/80">
                                            + {data.summary.totalIncome > 0
                                                ? ((cat.value / data.summary.totalIncome) * 100).toFixed(1)
                                                : "0.0"}%
                                        </TableCell>
                                    </TableRow>
                                    {cat.subcategories.map((sub) => (
                                        <TableRow key={`${cat.name}-${sub.name}`} className="border-none hover:bg-transparent">
                                            <TableCell className="pl-8 text-xs text-muted-foreground flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                {sub.name}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground font-mono">
                                                {formatCurrency(sub.value)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground opacity-60">
                                                {data.summary.totalIncome > 0
                                                    ? ((sub.value / data.summary.totalIncome) * 100).toFixed(1)
                                                    : "0.0"}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Fragment>
                            ))}
                            <TableRow className="h-4" />
                            <TableRow className="bg-muted/50 font-semibold border-t-2">
                                <TableCell>Expenses</TableCell>
                                <TableCell className="text-right" />
                                <TableCell className="text-right" />
                            </TableRow>
                            {data.expenseBreakdown.map((cat) => (
                                <Fragment key={cat.name}>
                                    <TableRow className="bg-muted/30 font-semibold group/row">
                                        <TableCell className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                            {cat.name}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatCurrency(cat.value)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {data.summary.totalIncome > 0
                                                ? ((cat.value / data.summary.totalIncome) * 100).toFixed(1)
                                                : "0.0"}%
                                        </TableCell>
                                    </TableRow>
                                    {cat.subcategories.map((sub) => (
                                        <TableRow key={`${cat.name}-${sub.name}`} className="border-none hover:bg-transparent">
                                            <TableCell className="pl-8 text-xs text-muted-foreground flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                {sub.name}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground font-mono">
                                                {formatCurrency(sub.value)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground opacity-60">
                                                {data.summary.totalIncome > 0
                                                    ? ((sub.value / data.summary.totalIncome) * 100).toFixed(1)
                                                    : "0.0"}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Fragment>
                            ))}
                            <TableRow className="border-t-2 font-bold">
                                <TableCell>Total Expenses</TableCell>
                                <TableCell className="text-right text-rose-600 dark:text-rose-400">
                                    {formatCurrency(data.summary.totalExpenses)}
                                </TableCell>
                                <TableCell className="text-right text-rose-600/70">
                                    {data.summary.totalIncome > 0
                                        ? ((data.summary.totalExpenses / data.summary.totalIncome) * 100).toFixed(1)
                                        : "0.0"}%
                                </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/20 font-bold border-y">
                                <TableCell>Gross Flow</TableCell>
                                <TableCell className={cn(
                                    "text-right",
                                    data.summary.grossFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {formatCurrency(data.summary.grossFlow)}
                                </TableCell>
                                <TableCell className="text-right">
                                    {data.summary.totalIncome > 0
                                        ? ((data.summary.grossFlow / data.summary.totalIncome) * 100).toFixed(1)
                                        : "0.0"}%
                                </TableCell>
                            </TableRow>
                            <TableRow className="font-semibold text-muted-foreground italic">
                                <TableCell>Total Provisions (Funding)</TableCell>
                                <TableCell className="text-right">
                                    - {formatCurrency(data.summary.totalFunding)}
                                </TableCell>
                                <TableCell className="text-right">
                                    {data.summary.totalIncome > 0
                                        ? ((data.summary.totalFunding / data.summary.totalIncome) * 100).toFixed(1)
                                        : "0.0"}%
                                </TableCell>
                            </TableRow>
                            <TableRow className="bg-blue-50/50 dark:bg-blue-950/20 font-bold border-t-2 border-blue-200 dark:border-blue-800">
                                <TableCell>Net Flow (Safe Cash)</TableCell>
                                <TableCell className={cn(
                                    "text-right",
                                    data.summary.netFlow >= 0 ? "text-blue-600" : "text-orange-600"
                                )}>
                                    {formatCurrency(data.summary.netFlow)}
                                </TableCell>
                                <TableCell className="text-right">
                                    {data.summary.totalIncome > 0
                                        ? ((data.summary.netFlow / data.summary.totalIncome) * 100).toFixed(1)
                                        : "0.0"}%
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
