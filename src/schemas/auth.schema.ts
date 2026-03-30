import { z } from "zod";

export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Email must be a valid email address")),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long"),
});

export type AuthBody = z.infer<typeof authSchema>;
