import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the SERVICE_ROLE key for admin operations.
 * This bypasses RLS policies and allows user management.
 * 
 * @returns SupabaseClient
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined. Cannot create admin client.");
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
