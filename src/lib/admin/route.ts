import "server-only";
import { NextResponse } from "next/server";
import { getSuperAdmin } from "./session";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

/** Wraps an admin GET handler: verifies the session's admin status and never lets responses enter shared caches. */
export async function adminJson(load: () => Promise<unknown>) {
  if (!await getSuperAdmin()) return NextResponse.json({ error: "Not permitted" }, { status: 403, headers });
  try { return NextResponse.json(await load(), { headers }); }
  catch { return NextResponse.json({ error: "Could not load admin data" }, { status: 503, headers }); }
}

export const searchParamsOf = (request: Request) => Object.fromEntries(new URL(request.url).searchParams);
