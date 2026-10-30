import { z } from "zod";

// Validate lazily so the demo builds without credentials. Explicit env property
// access is required for Next.js browser-side substitution.
export function getSupabasePublicEnv() {
  return z.object({
    url: z.url().refine(value => {
      const url = new URL(value);
      return !url.username && !url.password && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
    }, "Use the Supabase project API URL"),
    key: z.string().min(1).refine(value => {
      if (value.startsWith("sb_publishable_")) return true;
      try { return JSON.parse(atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "anon"; }
      catch { return false; }
    }, "Use a publishable/anon key; secret and service-role keys must never be public"),
  }).parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
}
