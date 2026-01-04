import { createClient } from "./src/lib/supabase/server";

async function debug() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current User:", user?.id);

    const { data: workspaces } = await supabase.from("workspaces").select("id, name, currency");
    console.log("Workspaces:", workspaces);

    if (workspaces && workspaces.length > 0) {
        for (const ws of workspaces) {
            const { count, data: txs } = await supabase
                .from("transactions")
                .select("*", { count: "exact" })
                .eq("workspace_id", ws.id)
                .limit(5);
            console.log(`Workspace ${ws.name} (${ws.id}) TX Count:`, count);
            console.log("Sample TXs:", txs);
        }
    }
}

debug();
