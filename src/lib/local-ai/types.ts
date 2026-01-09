export type DraftTransaction = {
    type: "expense" | "income" | "transfer";
    amount: number | null;
    currency: string | null;
    vendor: string | null;
    note: string | null;
    category_guess: string | null;
    account_from_guess: string | null;
    account_to_guess: string | null;
    confidence: number | null;
};

export type LocalAIState =
    | "idle"
    | "unsupported"
    | "downloading"
    | "loading"
    | "ready"
    | "thinking"
    | "error";

export type LocalAIEvent =
    | { type: "status"; status: LocalAIState; progress?: number; message?: string }
    | { type: "draft"; draft: DraftTransaction }
    | { type: "error"; error: string };

export type WorkerMessage =
    | { type: "load"; modelUrl: string }
    | { type: "generate"; text: string; context?: any }
    | { type: "unload" };
