import { useRef, useState, useCallback, useEffect } from "react";
import { type DraftTransaction, type LocalAIState } from "./types";

export function useLocalAIEngine() {
    const workerRef = useRef<Worker | null>(null);
    const [status, setStatus] = useState<LocalAIState>("idle");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize worker
        if (typeof window !== "undefined" && window.Worker) {
            workerRef.current = new Worker(new URL("../../workers/local-ai.worker.ts", import.meta.url));

            workerRef.current.onmessage = (e) => {
                const msg = e.data;
                if (msg.type === "status") {
                    setStatus(msg.status);
                    if (msg.progress !== undefined) setProgress(msg.progress);
                } else if (msg.type === "error") {
                    setStatus("error");
                    setError(msg.error);
                }
            };
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const loadModel = useCallback(() => {
        if (!workerRef.current) return;
        // Point to Hugging Face directly for Dev/Testing (Zero-Setup)
        // In Prod, we would point to window.location.origin + "/models/..."
        const modelUrl = "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
        workerRef.current.postMessage({ type: "load", modelUrl });
    }, []);

    const generateDraft = useCallback((text: string) => {
        return new Promise<DraftTransaction>((resolve, reject) => {
            if (!workerRef.current) return reject("No worker");

            const handler = (e: MessageEvent) => {
                const msg = e.data;
                if (msg.type === "draft") {
                    workerRef.current?.removeEventListener("message", handler);
                    resolve(msg.draft);
                } else if (msg.type === "error") {
                    workerRef.current?.removeEventListener("message", handler);
                    reject(msg.error);
                }
            };

            workerRef.current.addEventListener("message", handler);
            workerRef.current.postMessage({ type: "generate", text });
        });
    }, []);

    return {
        status,
        progress,
        error,
        loadModel,
        generateDraft
    };
}
