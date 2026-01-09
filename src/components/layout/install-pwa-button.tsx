"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPWAButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        console.log("[PWA Debug] InstallPWAButton mounted");

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log("[PWA Debug] App is already installed (standalone mode)");
            setIsInstalled(true);
        }

        const handler = (e: any) => {
            console.log("[PWA Debug] 'beforeinstallprompt' event fired!", e);
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    if (isInstalled) return null;

    if (!deferredPrompt) {
        return (
            <Button
                variant="ghost"
                size="sm"
                disabled
                className="w-full justify-start gap-2 mt-2 text-muted-foreground border-dashed border-2 border-muted"
            >
                <Download className="h-4 w-4 opacity-50" />
                PWA: Waiting...
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 mt-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
            onClick={handleInstallClick}
        >
            <Download className="h-4 w-4" />
            Get Mizan App
        </Button>
    );
}
