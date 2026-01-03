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

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make your app vulnerable
    // to security issues.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Define public routes that don't require authentication
    const publicRoutes = ["/", "/auth/sign-in", "/auth/sign-up", "/auth/callback"];
    const isPublicRoute = publicRoutes.some(
        (route) => request.nextUrl.pathname === route
    );

    if (!user && !isPublicRoute) {
        // No user and not on a public route, redirect to sign-in
        const url = request.nextUrl.clone();
        url.pathname = "/auth/sign-in";
        return NextResponse.redirect(url);
    }

    // If user is authenticated and on auth pages, redirect to onboarding or dashboard
    if (user && request.nextUrl.pathname.startsWith("/auth/")) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding/create-workspace";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
