import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { listRestaurantsForUser } from "@/lib/tenancy/restaurants";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
export async function GET() {
  const user = await getVerifiedUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers });
  try {
    const restaurants = await listRestaurantsForUser(user.id);
    return NextResponse.json({ restaurants }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not load restaurants" }, { status: 503, headers });
  }
}
