"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getThemeForEmail } from "@/lib/domain-config";

/**
 * DomainThemeProvider applies custom themes based on the user's email domain.
 * It sets a data-theme attribute on the HTML element that activates domain-specific CSS.
 */
export function DomainThemeProvider({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        async function applyDomainTheme() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user?.email) {
                    const theme = getThemeForEmail(user.email);
                    if (theme !== "default") {
                        document.documentElement.setAttribute("data-theme", theme);
                    } else {
                        document.documentElement.removeAttribute("data-theme");
                    }
                } else {
                    // No user logged in - remove custom theme
                    document.documentElement.removeAttribute("data-theme");
                }
            } catch (error) {
                // Silently fail - default theme will be used
                console.error("Failed to apply domain theme:", error);
            }
        }

        applyDomainTheme();

        // Listen for auth state changes
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            applyDomainTheme();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Avoid hydration mismatch by not rendering theme-dependent styles until mounted
    if (!mounted) {
        return <>{children}</>;
    }

    return <>{children}</>;
}
