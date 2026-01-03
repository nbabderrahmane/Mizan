import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Define public routes that don't require authentication
    const publicRoutes = ["/", "/auth/sign-in", "/auth/sign-up", "/auth/callback"];
    const isPublicRoute = publicRoutes.some((route) => pathname === route);

    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/sign-in";
        return NextResponse.redirect(url);
    }

    // Handle authenticated user routing
    if (user) {
        const isAuthPage = pathname.startsWith("/auth/");
        const isOnboardingPage = pathname === "/onboarding/create-workspace";

        // Check workspaces for auth pages only (allow access to onboarding for multiple workspaces)
        if (isAuthPage) {
            const { data: memberships } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("user_id", user.id)
                .limit(1);

            // If on auth page, redirect appropriately
            if (isAuthPage) {
                const url = request.nextUrl.clone();
                if (memberships && memberships.length > 0) {
                    url.pathname = `/w/${memberships[0].workspace_id}/dashboard`;
                } else {
                    url.pathname = "/onboarding/create-workspace";
                }
                return NextResponse.redirect(url);
            }
        }
    }

    return supabaseResponse;
}




