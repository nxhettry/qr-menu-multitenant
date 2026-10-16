import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env/public";

// Never use inside shared `use cache`. src/proxy.ts handles token refresh.
export async function createClient() {
  await connection();
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicEnv();
  return createServerClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy handles token refresh.
        }
      },
    },
  });
}
