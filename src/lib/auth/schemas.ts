import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});
export const reservedSlugs = new Set([
  "dashboard", "login", "register", "api", "q", "admin", "settings", "pricing",
  "about", "help", "terms", "privacy", "setup", "auth", "onboarding",
  "forgot-password", "reset-password", "robots", "sitemap", "www", "momo-house",
]);
export const restaurantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().min(3).max(40).regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/,
    "Use lowercase letters, numbers, and hyphens; begin and end with a letter or number")
    .refine(value => !reservedSlugs.has(value), "This address is reserved"),
});
export type FormState = { error?: string; message?: string };
