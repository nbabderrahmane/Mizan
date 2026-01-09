import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import { SYSTEM_PROMPT } from "../lib/local-ai/prompts";
import { repairJSON } from "../lib/local-ai/schema";

let engine: MLCEngine | null = null;

// Ensure we are in a worker environment
const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
    const msg = e.data;

    try {
        switch (msg.type) {
            case "load":
                await loadModel(msg.modelUrl);
                break;

            case "generate":
                await generateDraft(msg.text);
                break;

            case "unload":
                if (engine) {
                    await engine.unload();
                    engine = null;
                }
                break;
        }
    } catch (err: any) {
        ctx.postMessage({ type: "error", error: err.message || "Unknown worker error" });
    }
};

async function loadModel(modelUrl: string) {
    // Configure engine to use self-hosted model
    // URL passed should be like: /models/Qwen2.5-0.5B-Instruct-q4f16_1-MLC

    // We construct the app config dynamically to point to our local assets
    const appConfig = {
        model_list: [
            {
                "model": "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC", // Logical ID used by WebLLM defaults
                "model_id": "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
                "model_lib": "webllm_qwen2_5", // Usually fetched from CDN, but we might need to handle this
            }
        ],
        // Override the weights URL to be local
        // NOTE: WebLLM resolving logic is complex. 
        // Simplest way for self-host is to provide a full AppConfig to CreateMLCEngine 
        // or use `model` argument as the path if we initialize correctly.
    };

    // For V1 Mac-first self-host dev:
    // We will verify if we can pass the local path directly.
    // If running solely on client, '/models/...' is relative to window.

    ctx.postMessage({ type: "status", status: "loading", message: "Initializing engine..." });

    // Using the 'model' argument as specific modelId.
    // We need to guide WebLLM to look at our local folder.
    // WebLLM accepts `appConfig`.

    engine = await CreateMLCEngine(
        "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        {
            appConfig: {
                model_list: [
                    {
                        model: modelUrl, // This should be the URL to the model folder
                        model_id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
                        model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0.2.48/qwen2.5-0.5b-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm", // Fallback to GitHub for WASM lib for now (strictly model weights are self-hosted)
                        vram_required_MB: 350,
                        low_resource_required: true,
                    }
                ]
            },
            initProgressCallback: (report: { progress: number; text: string }) => {
                ctx.postMessage({
                    type: "status",
                    status: "downloading",
                    progress: report.progress,
                    message: report.text
                });
            }
        }
    );

    ctx.postMessage({ type: "status", status: "ready" });
}

async function generateDraft(text: string) {
    if (!engine) throw new Error("Engine not initialized");

    ctx.postMessage({ type: "status", status: "thinking" });

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
    ];

    const reply = await engine.chat.completions.create({
        messages: messages as any,
        temperature: 0.1, // Strict
        max_tokens: 256,
    });

    const rawOutput = reply.choices[0].message.content || "{}";

    try {
        const json = repairJSON(rawOutput);
        ctx.postMessage({ type: "draft", draft: json });
        ctx.postMessage({ type: "status", status: "ready" });
    } catch (e) {
        ctx.postMessage({ type: "error", error: "Failed to parse JSON draft" });
        ctx.postMessage({ type: "status", status: "ready" });
    }
}
