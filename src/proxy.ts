import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env/public";
import { resolveOldSlugCached } from "@/lib/menu/routing";
import { isRestaurantSlug } from "@/lib/menu/slugs";

export async function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(1);
  if (isRestaurantSlug(slug)) {
    let currentSlug: string | null = null;
    try { currentSlug = await resolveOldSlugCached(slug); }
    catch {
      return new NextResponse("We couldn’t load this menu. Please try again shortly.", {
        status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" },
      });
    }
    if (!currentSlug) return NextResponse.next();
    const destination = request.nextUrl.clone();
    destination.pathname = `/${currentSlug}`;
    const redirect = NextResponse.redirect(destination, 301);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }
  if (!/^\/(login|register|forgot-password|reset-password|auth|onboarding|dashboard|admin|api\/dashboard|api\/admin)(\/|$)/.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const { url, key } = getSupabasePublicEnv();
  const supabase = createServerClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousCookies = response.cookies.getAll();
        const previousHeaders = new Headers(response.headers);
        response = NextResponse.next({ request });
        previousCookies.forEach(cookie => response.cookies.set(cookie));
        previousHeaders.forEach((value, name) => {
          if (["cache-control", "expires", "pragma"].includes(name)) response.headers.set(name, value);
        });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

// Single-segment public addresses only resolve history; they never refresh auth.
export const config = { matcher: [
  "/:slug",
  "/login", "/register", "/forgot-password", "/reset-password",
  "/auth/:path*", "/onboarding", "/dashboard/:path*", "/api/dashboard/:path*",
  "/admin/:path*", "/api/admin/:path*",
] };
