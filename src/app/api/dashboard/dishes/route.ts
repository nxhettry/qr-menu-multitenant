import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { getDishCatalog } from "@/lib/dishes/repository";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
export async function GET() {
  if (!await getVerifiedUser()) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers });
  try {
    return NextResponse.json(await getDishCatalog(), { headers });
  } catch {
    return NextResponse.json({ error: "Could not load dishes" }, { status: 503, headers });
  }
}
