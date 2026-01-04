import { getPandLReport } from "@/lib/data/reports";
import { createClient } from "@/lib/supabase/server";

export default async function DebugReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ workspaceId?: string }>;
}) {
    const { workspaceId } = await searchParams;

    const supabase = await createClient();
    const { data: workspaces } = await supabase.from("workspaces").select("id, name");

    if (!workspaceId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold">Select a Workspace to Debug</h1>
                <ul className="mt-4 space-y-2">
                    {workspaces?.map(ws => (
                        <li key={ws.id}>
                            <a href={`/debug-reports?workspaceId=${ws.id}`} className="text-blue-500 hover:underline">
                                {ws.name} ({ws.id})
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    const reportData = await getPandLReport(workspaceId, { period: "6m" });
    const { data: rawTxs } = await supabase
        .from("transactions")
        .select("*, account:account_id(base_currency)")
        .eq("workspace_id", workspaceId)
        .limit(10);

    const { count: totalTxCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-bold">Debug Reports</h1>

            <section>
                <h2 className="text-xl font-semibold">Environment</h2>
                <pre className="bg-muted p-4 rounded mt-2">
                    {JSON.stringify({
                        workspaceId,
                        totalTxCountInDB: totalTxCount
                    }, null, 2)}
                </pre>
            </section>

            <section>
                <h2 className="text-xl font-semibold">Report Summary (Last 6M)</h2>
                <pre className="bg-muted p-4 rounded mt-2">
                    {JSON.stringify(reportData.summary, null, 2)}
                </pre>
            </section>

            <section>
                <h2 className="text-xl font-semibold">Raw Transactions (First 10)</h2>
                <div className="overflow-auto mt-2">
                    <table className="min-w-full divide-y divide-border border rounded">
                        <thead>
                            <tr>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Type</th>
                                <th className="p-2 text-left">Amount</th>
                                <th className="p-2 text-left">Currency</th>
                                <th className="p-2 text-left">Base Amount</th>
                                <th className="p-2 text-left">Account Currency</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rawTxs?.map(tx => (
                                <tr key={tx.id} className="border-t">
                                    <td className="p-2">{tx.date}</td>
                                    <td className="p-2">{tx.type}</td>
                                    <td className="p-2">{tx.original_amount}</td>
                                    <td className="p-2">{tx.original_currency}</td>
                                    <td className="p-2">{tx.base_amount}</td>
                                    <td className="p-2">{(tx.account as any)?.base_currency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
