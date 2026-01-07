import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, response?: NextResponse) {
    let supabaseResponse = response || NextResponse.next({
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

    const pathname = request.nextUrl.pathname;

    // EXCLUSION: Skip DB calls for static assets and images
    if (
        pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|mp4)$/) ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/') // Let API routes handle their own auth
    ) {
        return supabaseResponse;
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Helper to check if a path corresponds to a public route, ignoring locale prefix
    const isPublicRoute = (path: string) => {
        const publicRoutes = ["/", "/auth/sign-in", "/auth/sign-up", "/auth/callback"];
        // Strip the locale prefix if it exists (e.g., /en/auth/sign-in -> /auth/sign-in)
        const pathWithoutLocale = path.replace(/^\/(en|fr)(\/|$)/, "/");
        // Ensure pathWithoutLocale is never empty string for root matching
        const normalizedPath = pathWithoutLocale === "" ? "/" : pathWithoutLocale;
        return publicRoutes.includes(normalizedPath);
    };

    if (!user && !isPublicRoute(pathname)) {
        const url = request.nextUrl.clone();
        // Redirect to sign-in, maintaining locale if present
        const localeMatch = pathname.match(/^\/(en|fr)/);
        const locale = localeMatch ? localeMatch[0] : "";
        url.pathname = `${locale}/auth/sign-in`;
        return NextResponse.redirect(url);
    }

    // Handle authenticated user routing
    if (user) {
        // Strip locale for logic checks
        const pathWithoutLocale = pathname.replace(/^\/(en|fr)(\/|$)/, "/");
        const normalizedPath = pathWithoutLocale === "" ? "/" : pathWithoutLocale;
        const localeMatch = pathname.match(/^\/(en|fr)/);
        const locale = localeMatch ? localeMatch[0] : "";

        const isAuthPage = normalizedPath.startsWith("/auth/");
        const isLandingPage = normalizedPath === "/";
        const isOnboardingPage = normalizedPath === "/onboarding/create-workspace";

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
                url.pathname = `${locale}/role-selection`;
            } else if (isSupportAdmin) {
                // Admin only -> Admin Dashboard
                url.pathname = `${locale}/admin`;
            } else if (hasWorkspaces) {
                // Member only -> Workspace Dashboard
                url.pathname = `${locale}/w/${memberships[0].workspace_id}/dashboard`;
            } else {
                // Neither -> Onboarding
                url.pathname = `${locale}/onboarding`;
            }
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}




