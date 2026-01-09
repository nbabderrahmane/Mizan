"use client";

import { useState, useEffect } from "react";
import { useLocalAIEngine } from "@/lib/local-ai/engine";
import { DraftTransaction } from "@/lib/local-ai/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose
} from "@/components/ui/drawer";
import { Loader2, Download, Wand2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MagicDraftDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDraft: (draft: DraftTransaction) => void;
}

export function MagicDraftDrawer({ open, onOpenChange, onDraft }: MagicDraftDrawerProps) {
    const { status, progress, error, loadModel, generateDraft } = useLocalAIEngine();
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Auto-load model if drawer is opened and status is idle (implies first use or reload)
    // NOTE: In a real app we might want explicit "Download" button first.
    // For V1 Mac-first, let's show download UI if status is idle/downloading.

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setIsGenerating(true);
        try {
            const draft = await generateDraft(input);
            onDraft(draft);
            onOpenChange(false);
            setInput(""); // Reset input on success
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const isModelReady = status === "ready";
    const isDownloading = status === "downloading" || status === "loading";
    const needsDownload = status === "idle" || status === "error";

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle className="flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-indigo-500" />
                            Magic Transaction
                        </DrawerTitle>
                        <DrawerDescription>
                            Describe your transaction naturally. 100% Private (On-Device).
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 space-y-4">
                        {/* Error State */}
                        {status === "error" && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {error || "Failed to load AI model."}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Download Prompt */}
                        {needsDownload && (
                            <div className="border rounded-lg p-6 flex flex-col items-center text-center bg-muted/30">
                                <Download className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="font-semibold mb-2">Download AI Model</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    ~350MB. Downloaded once, runs offline.
                                </p>
                                <Button onClick={loadModel} disabled={isDownloading}>
                                    {isDownloading ? "Downloading..." : "Download & Start"}
                                </Button>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isDownloading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Downloading model...</span>
                                    <span>{Math.round(progress * 100)}%</span>
                                </div>
                                <Progress value={progress * 100} className="h-2" />
                            </div>
                        )}

                        {/* Input Area */}
                        {isModelReady && (
                            <div className="space-y-4">
                                <Textarea
                                    placeholder="e.g. 'Coffee 5€ at Starbucks' or 'Salary 2500'"
                                    value={input}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                                    className="min-h-[100px] text-lg resize-none"
                                />
                                <div className="text-xs text-muted-foreground text-center">
                                    Try: "Uber 15€", "Virement 500 vers Epargne", "Salaire 2000"
                                </div>
                            </div>
                        )}
                    </div>

                    <DrawerFooter>
                        {isModelReady && (
                            <Button
                                onClick={handleGenerate}
                                disabled={!input.trim() || isGenerating}
                                className="w-full"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Thinking...
                                    </>
                                ) : (
                                    "Generate Draft"
                                )}
                            </Button>
                        )}
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
