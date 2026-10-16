import { NextResponse } from "next/server";
import { resolveMenuCode } from "@/lib/menu/routing";

export async function GET(request: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  let slug;
  try { slug = await resolveMenuCode(shortCode); }
  catch {
    return new Response("We couldn’t load this menu. Please try again shortly.", {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (!slug) {
    return new Response("This menu is not available right now.", {
      status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const response = NextResponse.redirect(new URL(`/${slug}`, request.url), 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
