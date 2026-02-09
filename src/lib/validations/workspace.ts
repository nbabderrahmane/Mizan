import { z } from "zod";

export const createWorkspaceSchema = z.object({
    name: z
        .string()
        .min(1, "Workspace name is required")
        .max(100, "Workspace name is too long")
        .trim(),
    currency: z
        .string()
        .min(3, "Currency code is required")
        .max(3, "Currency code must be 3 characters")
        .trim(),
    type: z.enum(["personal", "business"]).default("personal"),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
