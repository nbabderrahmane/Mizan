import { z } from "zod";

export const DraftTransactionSchema = z.object({
    type: z.enum(["expense", "income", "transfer"]),
    amount: z.number().nullable(),
    currency: z.string().nullable().optional(),
    vendor: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    category_guess: z.string().nullable().optional(),
    account_from_guess: z.string().nullable().optional(),
    account_to_guess: z.string().nullable().optional(),
    confidence: z.number().nullable().optional(),
});

export function repairJSON(text: string): any {
    try {
        // 1. Try direct parse
        return JSON.parse(text);
    } catch (e) {
        // 2. Extract JSON block ```json ... ```
        const jsonBlock = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonBlock) {
            try { return JSON.parse(jsonBlock[1]); } catch (e) { }
        }

        // 3. Extract first {...}
        const braceBlock = text.match(/\{[\s\S]*\}/);
        if (braceBlock) {
            try { return JSON.parse(braceBlock[0]); } catch (e) { }
        }

        throw new Error("Failed to extract JSON from model output");
    }
}
