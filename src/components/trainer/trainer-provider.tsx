"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Trainer Steps Definition
export type TrainerStep = {
    id: string;
    route: string; // The route where this step is active
    selector: string; // DOM selector to highlight
    titleKey: string;
    descKey: string;
    actionKey?: string;
    position: "top" | "bottom" | "left" | "right" | "center";
};

const TRAINER_STEPS: TrainerStep[] = [
    {
        id: "dashboard_intro",
        route: "/dashboard",
        selector: "[data-trainer='available-cash']",
        titleKey: "dashboard.title",
        descKey: "dashboard.desc",
        position: "bottom"
    },
    // Add more steps later
];

type TrainerContextType = {
    activeStep: TrainerStep | null;
    isVisible: boolean;
    completeStep: () => void;
    dismissTrainer: () => void;
    skipStep: () => void;
};

const TrainerContext = createContext<TrainerContextType | undefined>(undefined);

export function useTrainer() {
    const context = useContext(TrainerContext);
    if (!context) throw new Error("useTrainer must be used within TrainerProvider");
    return context;
}

interface TrainerProviderProps {
    children: ReactNode;
    workspaceId?: string; // Optional, might be available in layout params
}

export function TrainerProvider({ children, workspaceId }: TrainerProviderProps) {
    const [activeStep, setActiveStep] = useState<TrainerStep | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();
    const supabase = createClient();

    // Load state on mount
    useEffect(() => {
        if (!workspaceId) return;

        const loadState = async () => {
            // Anti-fatigue check (localStorage for speed + DB sync)
            const dismissedAt = localStorage.getItem(`mizan_trainer_dismissed_${workspaceId}`);
            if (dismissedAt) {
                // Check cooldown (e.g. 3 days)
                const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince < 3) return;
            }

            // Check DB state (if we want robust sync)
            // For MVP, we can rely on localStorage or check a cookie?
            // User requested DB persistence in workspace metadata.
            // We can fetch it once.
            const { data: ws } = await supabase.from("workspaces").select("metadata").eq("id", workspaceId).single();
            const meta = ws?.metadata as any;

            if (meta?.trainer_dismissed) {
                // Double check logic for cooldown if we want strict server side
                // For now, let's assume if it is explicitly dismissed in DB, we respect it unless user restarts
                return;
            }

            setIsVisible(true);
        };

        loadState();
    }, [workspaceId]);

    // Check for active steps based on route
    useEffect(() => {
        if (!isVisible) {
            setActiveStep(null);
            return;
        }

        // Simple route matching: does current pathname end with the step route?
        // e.g. /w/123/dashboard ends with /dashboard
        const step = TRAINER_STEPS.find(s => pathname?.endsWith(s.route));

        // Also check if step is already completed
        if (step) {
            const completed = JSON.parse(localStorage.getItem(`mizan_trainer_completed_${workspaceId}`) || "[]");
            if (!completed.includes(step.id)) {
                setActiveStep(step);
            } else {
                setActiveStep(null);
            }
        } else {
            setActiveStep(null);
        }

    }, [pathname, isVisible, workspaceId]);

    const completeStep = async () => {
        if (!activeStep || !workspaceId) return;

        // Persist completion
        const key = `mizan_trainer_completed_${workspaceId}`;
        const completed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!completed.includes(activeStep.id)) {
            completed.push(activeStep.id);
            localStorage.setItem(key, JSON.stringify(completed));

            // Sync to DB (fire and forget)
            // We need a server action or update via client if RLS allows
            // Let's assume we do this later or use a dedicated action if strictly needed. 
            // For MVP UI responsiveness, local is fine + eventual consistency.
        }

        setActiveStep(null);
    };

    const dismissTrainer = async () => {
        setIsVisible(false);
        setActiveStep(null);
        if (workspaceId) {
            localStorage.setItem(`mizan_trainer_dismissed_${workspaceId}`, new Date().toISOString());

            // Sync to DB
            const { data: ws } = await supabase.from("workspaces").select("metadata").eq("id", workspaceId).single();
            const currentMeta = ws?.metadata || {};
            await supabase.from("workspaces").update({
                metadata: { ...currentMeta, trainer_dismissed: true, trainer_dismissed_at: new Date().toISOString() }
            }).eq("id", workspaceId);
        }
    };

    const skipStep = () => {
        // Just mark this step as skipped/completed to move on
        completeStep();
    };

    return (
        <TrainerContext.Provider value={{ activeStep, isVisible, completeStep, dismissTrainer, skipStep }}>
            {children}
            {/* We could render the Overlay here directly if it doesn't need to be nested deeper */}
            {activeStep && isVisible && (
                <TrainerOverlay step={activeStep} />
            )}
        </TrainerContext.Provider>
    );
}

// Minimal Overlay Component (Internal for now)
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

function TrainerOverlay({ step }: { step: TrainerStep }) {
    const { completeStep, dismissTrainer, skipStep } = useTrainer();
    const t = useTranslations("Trainer"); // We need to add this namespace

    // In a real implementation, we would use a Popper/Floating UI library to position 
    // relative to step.selector. For MVP, we'll use a fixed position based on "position" prop logic
    // or just a nice bottom-right toast-like card if selector isn't found.

    // Simple fixed positioning for MVP
    const positionClasses = {
        bottom: "bottom-4 right-4",
        top: "top-4 right-4",
        left: "bottom-4 left-4",
        right: "bottom-4 right-4",
        center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    };

    return (
        <div className={`fixed z-50 w-80 bg-popover text-popover-foreground shadow-lg border rounded-lg p-4 animate-in fade-in zoom-in-95 duration-200 ${positionClasses[step.position]}`}>
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm">{t(step.titleKey as any)}</h3>
                <button onClick={dismissTrainer} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
                {t(step.descKey as any)}
            </p>
            <div className="flex justify-between items-center">
                <button onClick={skipStep} className="text-xs text-muted-foreground hover:underline">
                    Skip
                </button>
                <Button size="sm" onClick={completeStep}>
                    {step.actionKey ? t(step.actionKey as any) : "Next"}
                </Button>
            </div>
        </div>
    );
}
