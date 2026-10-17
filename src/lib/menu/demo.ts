import type { PublishedMenu } from "./schema";
import { itemDetailsSchema } from "./details.ts";

export const DEMO_SLUG = "momo-house";
export const DEMO_SHORT_CODE = "7Kx2pQa";

export const demoMenu: PublishedMenu = {
  id: "demo-momo-house", status: "PUBLISHED", slug: DEMO_SLUG, shortCode: DEMO_SHORT_CODE,
  name: "Momo House", nameNe: "म:म: हाउस", address: "Thamel, Kathmandu",
  description: "Good food. Warm company. A little taste of home.",
  updatedAt: "2026-10-16T00:00:00Z", phone: null, mapUrl: null, themeColor: "#9a3412",
  logoPublicId: null, logoVersion: null, coverPublicId: null, coverVersion: null,
  openingHours: {}, currency: "NPR", pricesIncludeVat: true, vatPercent: 13, serviceChargePercent: 0,
  categories: [
    { id: "00000000-0000-4000-8000-000000000001", name: "Momo", nameNe: null, items: [
      { id: "00000000-0000-4000-8000-000000000011", name: "Steamed momo", nameNe: "म:म:",
        description: "Hand-folded chicken dumplings with tomato and sesame achar.", descriptionNe: null,
        subcategory: "Chicken", details: itemDetailsSchema.parse({ is_popular: true, preparation_minutes: 15, tags: ["Handmade"], allergens: ["Wheat", "Sesame"], allergen_notes: "Illustrative information only. Ask the restaurant to confirm ingredients.", addon_groups: [{ name: "Extras", min_select: 0, max_select: 1, options: [{ name: "Extra achar", price_minor: 3000, is_available: true }] }] }),
        priceMinor: null, imagePublicId: null, imageVersion: null, isAvailable: true, isFeatured: true, diet: "NON_VEG", spiceLevel: 1,
        variants: [
          { id: "00000000-0000-4000-8000-000000000111", name: "Half plate", nameNe: null, priceMinor: 15000, isAvailable: true },
          { id: "00000000-0000-4000-8000-000000000112", name: "Full plate", nameNe: null, priceMinor: 25000, isAvailable: true },
        ] },
      { id: "00000000-0000-4000-8000-000000000012", name: "Jhol momo", nameNe: null,
        description: "Dumplings in a warming bowl of spiced sesame broth.", descriptionNe: null,
        subcategory: "Buff", priceMinor: null, imagePublicId: null, imageVersion: null, isAvailable: true, isFeatured: false, diet: "NON_VEG", spiceLevel: 2,
        variants: [
          { id: "00000000-0000-4000-8000-000000000121", name: "Half plate", nameNe: null, priceMinor: 18000, isAvailable: true },
          { id: "00000000-0000-4000-8000-000000000122", name: "Full plate", nameNe: null, priceMinor: 22000, isAvailable: true },
        ] },
    ] },
    { id: "00000000-0000-4000-8000-000000000002", name: "From the kitchen", nameNe: null, items: [
      { id: "00000000-0000-4000-8000-000000000021", name: "Vegetable chowmein", nameNe: null,
        description: "Wok-tossed noodles, fresh vegetables, and house spices.", descriptionNe: null,
        priceMinor: 16000, imagePublicId: null, imageVersion: null, isAvailable: true, isFeatured: false, diet: "VEG", spiceLevel: null, variants: [] },
      { id: "00000000-0000-4000-8000-000000000022", name: "Dal bhat set", nameNe: "दाल भात",
        description: "Rice, lentils, seasonal tarkari, greens, and achar.", descriptionNe: null,
        priceMinor: 28000, imagePublicId: null, imageVersion: null, isAvailable: true, isFeatured: false, diet: "VEG", spiceLevel: null, variants: [] },
    ] },
    { id: "00000000-0000-4000-8000-000000000003", name: "Something to sip", nameNe: null, items: [
      { id: "00000000-0000-4000-8000-000000000031", name: "Masala milk tea", nameNe: "चिया",
        description: "Freshly brewed with ginger and cardamom.", descriptionNe: null,
        priceMinor: 6000, imagePublicId: null, imageVersion: null, isAvailable: true, isFeatured: false, diet: "VEG", spiceLevel: null, variants: [] },
      { id: "00000000-0000-4000-8000-000000000032", name: "Sweet lassi", nameNe: null,
        description: "Chilled yogurt, lightly sweetened.", descriptionNe: null,
        priceMinor: 12000, imagePublicId: null, imageVersion: null, isAvailable: true, isFeatured: false, diet: "VEG", spiceLevel: null, variants: [] },
    ] },
  ],
};
