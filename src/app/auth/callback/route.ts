import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env/public";
import { safeNextPath } from "@/lib/auth/redirect";
import { getSiteOrigin } from "@/lib/env/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const origin = getSiteOrigin();
  const response = NextResponse.redirect(new URL(next, origin), 302);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  const { url, key } = getSupabasePublicEnv();
  const supabase = createServerClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }
  response.headers.set("Location", new URL("/login?error=confirmation", origin).href);
  return response;
}
