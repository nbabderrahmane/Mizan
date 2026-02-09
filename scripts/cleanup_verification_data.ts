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

    console.log("Cleaning up verification data...");

    const emailsToDelete = ["attacker@example.com", "victim@example.com"];

    // 1. Find Users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("Error listing users:", listError.message);
        process.exit(1);
    }

    const targets = users.users.filter(u => u.email && emailsToDelete.includes(u.email));

    if (targets.length === 0) {
        console.log("No test users found.");
        return;
    }

    for (const user of targets) {
        console.log(`Deleting user: ${user.email} (${user.id})...`);

        // 2. Delete Workspaces manually if needed (optional, assuming cascade or explicit cleanup preference)
        // Deleting the user usually triggers cascade delete on 'public.users', 
        // which should cascade to 'workspace_members', etc.
        // However, workspaces created by them might remain if on delete restrict/null.
        // Let's explicitly delete workspaces named WS-Attacker/WS-Victim to be clean.

        const wsName = user.email === "attacker@example.com" ? "WS-Attacker" : "WS-Victim";
        const { data: ws } = await supabase.from("workspaces").select("id").eq("name", wsName).single();

        if (ws) {
            console.log(`  Deleting workspace: ${wsName} (${ws.id})`);
            await supabase.from("workspaces").delete().eq("id", ws.id);
        }

        // 3. Delete Auth User
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
            console.error(`  Failed to delete user ${user.email}:`, deleteError.message);
        } else {
            console.log(`  Successfully deleted user ${user.email}`);
        }
    }

    console.log("Cleanup complete.");
}

main();
