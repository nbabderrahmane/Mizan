import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
    title: "Mizan - Shared Budget",
    description: "A shared budgeting web app for families and friends",
};

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Ensure that the incoming `locale` is valid
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Providing all messages to the client-side
    const messages = await getMessages();
    const dir = locale === "ar" ? "rtl" : "ltr";

    return (
        <html lang={locale} dir={dir}>
            <body className="antialiased">
                <NextIntlClientProvider messages={messages} locale={locale}>
                    {children}
                </NextIntlClientProvider>
                <Toaster />
            </body>
        </html>
    );
}
