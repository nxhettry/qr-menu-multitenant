import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export const DEMO_SLUG = "momo-house";
export const DEMO_SHORT_CODE = "7Kx2pQa";
export type MenuItem = {
  name: string; nameNe?: string; description: string; priceMinor?: number;
  variants?: { name: string; priceMinor: number }[];
};
const categories: { name: string; items: MenuItem[] }[] = [
  { name: "Momo", items: [
    { name: "Steamed momo", nameNe: "म:म:", description: "Hand-folded dumplings with tomato and sesame achar.", variants: [
      { name: "Veg", priceMinor: 15000 }, { name: "Chicken", priceMinor: 20000 }, { name: "Buff", priceMinor: 18000 },
    ] },
    { name: "Jhol momo", description: "Dumplings in a warming bowl of spiced sesame broth.", variants: [
      { name: "Veg", priceMinor: 18000 }, { name: "Buff", priceMinor: 22000 },
    ] },
  ] },
  { name: "From the kitchen", items: [
    { name: "Vegetable chowmein", description: "Wok-tossed noodles, fresh vegetables, and house spices.", priceMinor: 16000 },
    { name: "Dal bhat set", nameNe: "दाल भात", description: "Rice, lentils, seasonal tarkari, greens, and achar.", priceMinor: 28000 },
  ] },
  { name: "Something to sip", items: [
    { name: "Masala milk tea", nameNe: "चिया", description: "Freshly brewed with ginger and cardamom.", priceMinor: 6000 },
    { name: "Sweet lassi", description: "Chilled yogurt, lightly sweetened.", priceMinor: 12000 },
  ] },
];

export async function getPublicMenu(slug: string) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag(`menu-slug:${slug}`);
  if (slug !== DEMO_SLUG) return null;
  cacheTag("menu:demo-momo-house");
  return {
    id: "demo-momo-house", slug: DEMO_SLUG, shortCode: DEMO_SHORT_CODE,
    name: "Momo House", nameNe: "म:म: हाउस", address: "Thamel, Kathmandu",
    description: "Good food. Warm company. A little taste of home.", updatedAt: "2026-10-16", categories,
  };
}

export function formatPrice(priceMinor: number) {
  return `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(priceMinor / 100)}`;
}
