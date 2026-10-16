import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { DEMO_SHORT_CODE, DEMO_SLUG } from "./demo";
import { isRestaurantSlug } from "./slugs";

async function resolveSlug(functionName: "resolve_menu_code" | "resolve_old_slug", args: { p_code: string } | { p_slug: string }) {
  const { data, error } = await createPublicClient().rpc(functionName, args);
  if (error) throw new Error("Could not resolve the menu address");
  if (data === null) return null;
  if (typeof data !== "string" || !isRestaurantSlug(data)) throw new Error("Invalid menu address");
  return data;
}

export async function resolveMenuCode(code: string) {
  if (code === DEMO_SHORT_CODE) return DEMO_SLUG;
  if (!/^[A-Za-z0-9_-]{7}$/.test(code)) return null;
  return resolveSlug("resolve_menu_code", { p_code: code });
}

export async function resolveOldSlug(slug: string) {
  if (!isRestaurantSlug(slug)) return null;
  const currentSlug = await resolveSlug("resolve_old_slug", { p_slug: slug });
  return currentSlug === slug ? null : currentSlug;
}
