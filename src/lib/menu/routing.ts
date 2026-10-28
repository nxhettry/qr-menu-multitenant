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

const HISTORY_TTL_MS = 60_000;
const HISTORY_MAX_ENTRIES = 5_000;
type HistoryEntry = { slug: string | null; expires: number };
// Kept on globalThis so a rename handled by this process also clears what its proxy bundle remembered.
const store = globalThis as typeof globalThis & { __menuSlugHistory?: Map<string, HistoryEntry> };
const history = (store.__menuSlugHistory ??= new Map<string, HistoryEntry>());

/** Per-instance memo so repeat scans skip the history query; other instances may lag a rename by up to the TTL. */
export async function resolveOldSlugCached(slug: string) {
  const hit = history.get(slug);
  if (hit && hit.expires > Date.now()) return hit.slug;
  const currentSlug = await resolveOldSlug(slug);
  if (history.size >= HISTORY_MAX_ENTRIES) history.delete(history.keys().next().value!);
  history.set(slug, { slug: currentSlug, expires: Date.now() + HISTORY_TTL_MS });
  return currentSlug;
}

export function forgetSlugHistory(...slugs: string[]) {
  for (const slug of slugs) history.delete(slug);
}
