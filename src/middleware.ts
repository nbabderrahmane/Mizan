import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    // 1. Run i18n middleware first to handle locales
    const response = intlMiddleware(request);

    // 2. Pass the response to Supabase to handle session/auth
    return await updateSession(request, response);
}

export const config = {
    matcher: [
        // Match all locales
        "/",
        "/(en|fr)/:path*",
        // Match all request paths except for the ones starting with:
        // - _next/static (static files)
        // - _next/image (image optimization files)
        // - favicon.ico (favicon file)
        // - public folder
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
