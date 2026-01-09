import { listBudgets } from "@/lib/actions/budget";
import { listAccounts } from "@/lib/actions/account";
import { getDashboardStats } from "@/lib/data/dashboard";
import { countTransactions } from "@/lib/actions/transaction"; // Assuming this exists or we verify transactions manually
import { createClient } from "@/lib/supabase/server";

export default async function DebugPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const supabase = await createClient();

    // Fetch raw accounts without abstractions
    const { data: rawAccounts } = await supabase.from("accounts").select("*").eq("workspace_id", workspaceId);

    // Fetch raw transactions count
    const { count: txCount } = await supabase.from("transactions").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId);

    // Fetch raw budgets
    const { data: rawBudgets } = await supabase.from("budgets").select("*").eq("workspace_id", workspaceId);

    // Fetch server actions results
    const accountsAction = await listAccounts(workspaceId);
    const budgetsAction = await listBudgets(workspaceId);
    const dashboardStats = await getDashboardStats(workspaceId);

    return (
        <div className="p-8 font-mono text-xs whitespace-pre-wrap">
            <h1 className="text-xl font-bold mb-4">Debug Workspace: {workspaceId}</h1>

            <div className="grid grid-cols-2 gap-4">
                <div className="border p-4">
                    <h2 className="text-lg font-bold">Raw DB Accounts</h2>
                    {JSON.stringify(rawAccounts, null, 2)}
                </div>
                <div className="border p-4">
                    <h2 className="text-lg font-bold">Action: listAccounts</h2>
                    {JSON.stringify(accountsAction, null, 2)}
                </div>

                <div className="border p-4">
                    <h2 className="text-lg font-bold">Raw DB Transactions (Count: {txCount})</h2>
                    {/* We don't list all tx */}
                </div>
                <div className="border p-4">
                    <h2 className="text-lg font-bold">Dashboard Stats</h2>
                    <div>Total Balance: {dashboardStats.totalBalance}</div>
                    <div>Has Accounts: {String(dashboardStats.hasAccounts)}</div>
                    <div>Has Tx: {String(dashboardStats.hasTransactions)}</div>
                    <hr className="my-2" />
                    {JSON.stringify(dashboardStats, null, 2)}
                </div>

                <div className="border p-4">
                    <h2 className="text-lg font-bold">Raw DB Budgets</h2>
                    {JSON.stringify(rawBudgets, null, 2)}
                </div>
                <div className="border p-4">
                    <h2 className="text-lg font-bold">Action: listBudgets</h2>
                    {JSON.stringify(budgetsAction, null, 2)}
                </div>
            </div>
        </div>
    );
}
