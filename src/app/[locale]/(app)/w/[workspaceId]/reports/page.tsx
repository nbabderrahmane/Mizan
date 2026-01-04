import { getPandLReport } from "@/lib/data/reports";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceId: string }>;
    searchParams: Promise<{ period?: "this_month" | "last_month" | "3m" | "6m" | "12m" | "all" }>;
}) {
    const { workspaceId } = await params;
    const { period = "6m" } = await searchParams;

    const reportData = await getPandLReport(workspaceId, { period });

    return <ReportsClient workspaceId={workspaceId} initialData={reportData} period={period} />;
}
