import { z } from "zod";

export const createWorkspaceSchema = z.object({
    name: z
        .string()
        .min(1, "Workspace name is required")
        .max(100, "Workspace name is too long")
        .trim(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
