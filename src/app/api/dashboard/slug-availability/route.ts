import { getVerifiedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isRestaurantSlug } from "@/lib/menu/slugs";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  if (!await getVerifiedUser()) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!isRestaurantSlug(slug)) return Response.json({ available: false }, { headers });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("slug_available", { p_slug: slug });
  if (error || typeof data !== "boolean") return Response.json({ error: "We couldn’t check this address." }, { status: 503, headers });
  return Response.json({ available: data }, { headers });
}
