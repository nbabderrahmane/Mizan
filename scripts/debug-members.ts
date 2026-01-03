
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load env vars
config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or SERVICE_ROLE if bypassing RLS, but fetching members usually respects RLS. 
    // Actually, listWorkspaceMembers uses `createClient` from `@/lib/supabase/server` which uses cookies. 
    // We can't reuse that easily in a script.
    // simpler: Use service role key to query DB directly to see if data exists.

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("Checking profiles...");
    const { data: profiles, error: pError } = await supabase.from("profiles").select("*").limit(5);
    if (pError) console.error("Profile error:", pError);
    else console.log("Profiles found:", profiles);

    console.log("\nChecking workspace members...");
    // Just get first workspace
    const { data: workspaces } = await supabase.from("workspaces").select("id").limit(1);
    if (!workspaces?.length) {
        console.log("No workspaces found.");
        return;
    }
    const workspaceId = workspaces[0].id;
    console.log("Checking workspace:", workspaceId);

    const { data: members, error: mError } = await supabase.from("workspace_members").select(`
        user_id,
        profile:profiles(first_name, last_name)
    `).eq("workspace_id", workspaceId);

    if (mError) console.error("Member fetch error:", mError);
    else {
        console.log("Raw Members Data:", JSON.stringify(members, null, 2));
    }
}

main();
