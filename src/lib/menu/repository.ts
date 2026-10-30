import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { DEMO_SLUG, demoMenu } from "./demo";
import { publicMenuSchema } from "./schema";
import { isRestaurantSlug } from "./slugs";

export async function getPublicMenu(slug: string) {
  "use cache";
  cacheLife("menu");
  if (slug !== DEMO_SLUG && !isRestaurantSlug(slug)) return null;
  cacheTag(`menu-slug:${slug}`);
  if (slug === DEMO_SLUG) return demoMenu;
  const { data, error } = await createPublicClient().rpc("get_public_menu", { p_slug: slug });
  if (error) throw new Error("Could not load the public menu");
  const menu = publicMenuSchema.parse(data);
  if (menu?.status === "PUBLISHED") {
    if (menu.slug !== slug) throw new Error("Public menu address mismatch");
    cacheTag(`menu:${menu.id}`);
  }
  return menu;
}
