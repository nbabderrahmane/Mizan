import { z } from "zod";

export const createInviteSchema = z.object({
    email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
    role: z.enum(["MANAGER", "CONTRIBUTOR", "VIEWER"]),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
