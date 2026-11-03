import type { PublishedMenu } from "@/lib/menu/schema";
import { cloudinaryImageUrl, guestPrice } from "@/lib/menu/presentation";
import { absoluteUrl } from "./site";

const MAX_ITEMS = 120;
const dietSchema = { VEG: "https://schema.org/VegetarianDiet" } as const;

export function menuImageUrl(menu: Pick<PublishedMenu, "coverPublicId" | "coverVersion" | "logoPublicId" | "logoVersion">, width: number, height: number) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return cloudinaryImageUrl(cloud, menu.coverPublicId, menu.coverVersion, width, height) ?? cloudinaryImageUrl(cloud, menu.logoPublicId, menu.logoVersion, width, height);
}

export function restaurantJsonLd(menu: PublishedMenu) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const vat = { pricesIncludeVat: menu.pricesIncludeVat, vatPercent: menu.vatPercent };
  let remaining = MAX_ITEMS;
  const sections = menu.categories.filter(category => category.items.length).map(category => {
    const items = category.items.slice(0, Math.max(remaining, 0));
    remaining -= items.length;
    return {
      "@type": "MenuSection", name: category.name,
      hasMenuItem: items.map(item => {
        const price = item.priceMinor ?? Math.min(...item.variants.map(variant => variant.priceMinor));
        const image = cloudinaryImageUrl(cloud, item.imagePublicId, item.imageVersion, 640, 480);
        return {
          "@type": "MenuItem", name: item.name, ...(item.description ? { description: item.description } : {}), ...(image ? { image } : {}),
          ...(item.diet === "VEG" ? { suitableForDiet: dietSchema.VEG } : {}),
          ...(Number.isFinite(price) ? { offers: { "@type": "Offer", price: (guestPrice(price, vat) / 100).toFixed(2), priceCurrency: "NPR", availability: item.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } } : {}),
        };
      }),
    };
  }).filter(section => section.hasMenuItem.length);
  const image = menuImageUrl(menu, 1200, 630);
  return {
    "@context": "https://schema.org", "@type": "Restaurant", name: menu.name, url: absoluteUrl(`/${menu.slug}`),
    ...(menu.description ? { description: menu.description } : {}), ...(image ? { image } : {}),
    ...(menu.address ? { address: { "@type": "PostalAddress", streetAddress: menu.address, addressCountry: "NP" } } : {}),
    ...(menu.phone ? { telephone: menu.phone } : {}), ...(menu.mapUrl ? { hasMap: menu.mapUrl } : {}),
    currenciesAccepted: "NPR",
    hasMenu: { "@type": "Menu", name: `${menu.name} menu`, url: absoluteUrl(`/${menu.slug}`), inLanguage: ["en", "ne"], hasMenuSection: sections },
  };
}

export const breadcrumbJsonLd = (trail: { name: string; path: string }[]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: trail.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: absoluteUrl(crumb.path) })),
});
