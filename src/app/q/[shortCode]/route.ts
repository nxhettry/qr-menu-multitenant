import { NextResponse } from "next/server";
import { DEMO_SHORT_CODE, DEMO_SLUG } from "@/lib/menu/demo";

export async function GET(request: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  // Fixture only. Phase 2 replaces this with an uncached public DB lookup.
  if (shortCode !== DEMO_SHORT_CODE) {
    return new Response("This menu is not available right now.", {
      status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const response = NextResponse.redirect(new URL(`/${DEMO_SLUG}`, request.url), 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
