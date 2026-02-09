
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
        console.error("No service role key found!");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log("Setting up verification data...");

    // 1. Create Users
    console.log("Creating Attacker...");
    const { data: attacker, error: err1 } = await supabase.auth.admin.createUser({
        email: "attacker@example.com",
        password: "password123",
        email_confirm: true,
        user_metadata: { first_name: "Attacker", last_name: "User" }
    });
    // Ignore error if already exists, just get the user
    let attackerId = attacker.user?.id;
    if (err1) {
        console.log("Attacker exists or error:", err1.message);
        // Fetch ID if exists
        const { data: users } = await supabase.auth.admin.listUsers();
        attackerId = users.users.find(u => u.email === "attacker@example.com")?.id;
    }

    console.log("Creating Victim...");
    const { data: victim, error: err2 } = await supabase.auth.admin.createUser({
        email: "victim@example.com",
        password: "password123",
        email_confirm: true,
        user_metadata: { first_name: "Victim", last_name: "User" }
    });
    let victimId = victim.user?.id;
    if (err2) {
        console.log("Victim exists or error:", err2.message);
        const { data: users } = await supabase.auth.admin.listUsers();
        victimId = users.users.find(u => u.email === "victim@example.com")?.id;
    }

    if (!attackerId || !victimId) {
        console.error("Failed to get User IDs", { attackerId, victimId });
        process.exit(1);
    }

    console.log(`Attacker ID: ${attackerId}`);
    console.log(`Victim ID: ${victimId}`);

    // 2. Create Workspaces
    // Note: Creating workspace involves inserting into 'workspaces' table.
    // Triggers usually add the creator as member.

    console.log("Creating WS-Attacker...");
    const { data: wsA, error: errWsA } = await supabase.from("workspaces").insert({
        name: "WS-Attacker",
        created_by: attackerId,
        currency: "USD"
    }).select().single();

    // If fail, maybe already exists, try fetching
    let wsAttackerId = wsA?.id;
    if (errWsA) {
        console.log("Failed to create WS-Attacker (maybe exists):", errWsA.message);
        const { data } = await supabase.from("workspaces").select("id").eq("name", "WS-Attacker").single();
        wsAttackerId = data?.id;
    }

    console.log("Creating WS-Victim...");
    const { data: wsV, error: errWsV } = await supabase.from("workspaces").insert({
        name: "WS-Victim",
        created_by: victimId,
        currency: "USD"
    }).select().single();

    let wsVictimId = wsV?.id;
    if (errWsV) {
        console.log("Failed to create WS-Victim (maybe exists):", errWsV.message);
        const { data } = await supabase.from("workspaces").select("id").eq("name", "WS-Victim").single();
        wsVictimId = data?.id;
    }

    if (!wsAttackerId || !wsVictimId) {
        console.error("Failed to get Workspace IDs", { wsAttackerId, wsVictimId });
        process.exit(1);
    }

    console.log(`WS-Attacker ID: ${wsAttackerId}`);
    console.log(`WS-Victim ID:   ${wsVictimId}`);

    // 3. Ensure Membership (Explicitly add if trigger failed or pre-existing)
    await supabase.from("workspace_members").upsert({
        workspace_id: wsAttackerId,
        user_id: attackerId,
        role: "OWNER"
    });

    await supabase.from("workspace_members").upsert({
        workspace_id: wsVictimId,
        user_id: victimId,
        role: "OWNER"
    });

    // 4. Ensure Attacker is NOT in WS-Victim
    await supabase.from("workspace_members").delete()
        .eq("workspace_id", wsVictimId)
        .eq("user_id", attackerId);

    console.log("Verification Data Prepared Successfully.");
}

main();
