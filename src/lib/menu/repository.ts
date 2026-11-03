import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { DEMO_SLUG, demoMenu } from "./demo";
import { publicMenuSchema } from "./schema";
import { isRestaurantSlug } from "./slugs";

const publishedMenuRow = z.object({ slug: z.string(), updated_at: z.string() });

export async function listPublishedMenus() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("menu-index");
  const { data, error } = await createPublicClient().rpc("list_published_menus");
  if (error) throw new Error("Could not list published menus");
  return z.array(publishedMenuRow).parse(data).filter(row => isRestaurantSlug(row.slug)).map(row => ({ slug: row.slug, updatedAt: new Date(row.updated_at) }));
}

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
