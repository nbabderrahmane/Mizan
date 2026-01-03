
import { z } from "zod";

export const updateProfileSchema = z.object({
    first_name: z.string().trim().max(50).nullable().optional(),
    last_name: z.string().trim().max(50).nullable().optional(),
});
