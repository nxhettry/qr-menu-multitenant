import type { MetadataRoute } from "next";
import { listPublishedMenus } from "@/lib/menu/repository";
import { places } from "@/lib/seo/places";
import { absoluteUrl } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const menus = await listPublishedMenus().catch(() => []);
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...places.map(place => ({ url: absoluteUrl(`/qr-menu/${place.slug}`), changeFrequency: "monthly" as const, priority: place.kind === "country" ? 0.9 : 0.8 })),
    { url: absoluteUrl("/register"), changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    ...menus.map(menu => ({ url: absoluteUrl(`/${menu.slug}`), lastModified: menu.updatedAt, changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
