import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address.").toLowerCase(),
  password: z.string(),
  callbackUrl: z.optional(z.string().startsWith("/")),
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required.")
      .regex(/^[^\d]*$/, "First name cannot contain numbers."),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required.")
      .regex(/^[^\d]*$/, "Last name cannot contain numbers."),
    email: z.email("Invalid email address.").toLowerCase(),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
    callbackUrl: z.optional(z.string().startsWith("/")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterData = z.infer<typeof registerSchema>;
