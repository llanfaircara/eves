import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6).max(72),
  role: z.enum(["MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
