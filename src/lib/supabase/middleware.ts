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
        const isLandingPage = pathname === "/";
        const isOnboardingPage = pathname === "/onboarding/create-workspace";

        // Redirect authenticated users from auth pages or landing page
        if (isAuthPage || isLandingPage) {
            // Check Admin Status
            const { data: admin } = await supabase
                .from("app_admins")
                .select("role")
                .eq("user_id", user.id)
                .single();
            const isSupportAdmin = !!admin;

            // Check Workspace Membership
            const { data: memberships } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("user_id", user.id)
                .limit(1);
            const hasWorkspaces = memberships && memberships.length > 0;

            const url = request.nextUrl.clone();

            if (isSupportAdmin && hasWorkspaces) {
                // If both, let them choose
                url.pathname = "/role-selection";
            } else if (isSupportAdmin) {
                // Admin only -> Admin Dashboard
                url.pathname = "/admin";
            } else if (hasWorkspaces) {
                // Member only -> Workspace Dashboard
                url.pathname = `/w/${memberships[0].workspace_id}/dashboard`;
            } else {
                // Neither -> Onboarding
                url.pathname = "/onboarding";
            }
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}




