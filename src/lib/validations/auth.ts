import { z } from "zod";

// Password validation rules
// - Minimum 8 characters
// - At least one letter
// - At least one number
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number");

export const signUpSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: passwordSchema,
    firstName: z.string().min(1, "First name is required").max(50, "First name is too long"),
    lastName: z.string().min(1, "Last name is required").max(50, "Last name is too long"),
});

export const signInSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export const updateProfileSchema = z.object({
    fullName: z.string().min(1, "Full name is required").max(100, "Full name is too long"),
    avatarUrl: z.string().url().optional().or(z.literal("")),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
