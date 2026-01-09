import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Home() {
    const t = useTranslations("Landing");

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                {t("description")}
            </p>
            <div className="flex gap-4">
                <Link
                    href="/auth/sign-in"
                    className="px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                >
                    {t("signIn")}
                </Link>
                <Link
                    href="/auth/sign-up"
                    className="px-6 py-3 border border-foreground rounded-lg hover:bg-foreground/5 transition-colors"
                >
                    {t("signUp")}
                </Link>
            </div>
        </div>
    );
}
