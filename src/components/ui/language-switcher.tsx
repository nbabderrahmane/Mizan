"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
    const t = useTranslations("Auth");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const switchLocale = (nextLocale: "en" | "fr") => {
        router.replace(pathname, { locale: nextLocale });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9">
                    <Languages className="h-4 w-4" />
                    <span className="sr-only">{t("selectLanguage")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => switchLocale("en")} className={locale === "en" ? "bg-accent" : ""}>
                    🇺🇸 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("fr")} className={locale === "fr" ? "bg-accent" : ""}>
                    🇫🇷 Français
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
