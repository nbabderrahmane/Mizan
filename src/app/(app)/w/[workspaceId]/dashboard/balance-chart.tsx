"use client";

import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBalanceHistoryAction } from "@/lib/actions/dashboard";
import { Loader2 } from "lucide-react";

interface BalanceChartProps {
    workspaceId: string;
    currency: string;
    accountId?: string;
}

type Range = "7d" | "30d" | "mtd" | "90d" | "1y";

export function BalanceChart({ workspaceId, currency, accountId }: BalanceChartProps) {
    const [range, setRange] = useState<Range>("30d");
    const [data, setData] = useState<{ date: string; balance: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetchData() {
            setLoading(true);
            const result = await getBalanceHistoryAction(workspaceId, range, accountId);
            if (mounted && result.success && result.data) {
                setData(result.data);
            }
            if (mounted) setLoading(false);
        }

        fetchData();

        return () => { mounted = false; };
    }, [workspaceId, range, accountId]);

    return (
        <Card className="col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">Balance History</CardTitle>
                <Tabs value={range} onValueChange={(v) => setRange(v as Range)} className="w-auto">
                    <TabsList className="grid w-full grid-cols-5 h-8">
                        <TabsTrigger value="7d" className="text-xs px-2 h-6">7D</TabsTrigger>
                        <TabsTrigger value="30d" className="text-xs px-2 h-6">30D</TabsTrigger>
                        <TabsTrigger value="mtd" className="text-xs px-2 h-6">Month</TabsTrigger>
                        <TabsTrigger value="90d" className="text-xs px-2 h-6">3M</TabsTrigger>
                        <TabsTrigger value="1y" className="text-xs px-2 h-6">1Y</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    {loading ? (
                        <div className="flex bg-muted/10 h-full w-full items-center justify-center rounded-md">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                    }}
                                    interval="preserveStartEnd"
                                    minTickGap={30}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(value)}`}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                Date
                                                            </span>
                                                            <span className="font-bold text-muted-foreground">
                                                                {new Date(payload[0].payload.date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                Balance
                                                            </span>
                                                            <span className="font-bold">
                                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(payload[0].value as number)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="hsl(var(--primary))"
                                    fillOpacity={1}
                                    fill="url(#colorBalance)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
