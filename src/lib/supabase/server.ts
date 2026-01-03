import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method is called from a Server Component.
                        // This can be ignored if you have middleware refreshing user sessions.
                    }
                },
            },
        }
    );
}

/**
 * Creates a Supabase client with the service role key.
 * This bypasses RLS - use only for admin operations.
 * NEVER expose this to the browser.
 */
export async function createAdminClient() {
    // Service role key is optional for Phase 0-6
    // Only needed for Phase 7 (password resets, admin seeding)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            cookies: {
                getAll() {
                    return [];
                },
                setAll() {
                    // Admin client doesn't need cookies
                },
            },
        }
    );
}
