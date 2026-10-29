import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/env/public";
import { getSupabaseSecretKey } from "@/lib/env/server";

// Bypasses RLS. Only call after requireSuperAdmin(), and only for Auth admin operations.
export function createServiceClient() {
  return createClient(getSupabasePublicEnv().url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
