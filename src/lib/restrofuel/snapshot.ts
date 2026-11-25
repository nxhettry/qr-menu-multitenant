import { z } from "zod";
import { MAX_PRICE_MINOR } from "../menu/vat.ts";

/** The menu a RestroFuel server sends (docs/RESTROFUEL-INTEGRATION.md, "Snapshot"). */

const ref = z.string().regex(/^[0-9]{1,18}$/);
const rupees = z.number().finite().min(0).max(MAX_PRICE_MINOR / 100);
const text = (max: number) => z.string().trim().min(1).transform(value => value.slice(0, max));
const clipped = (max: number) => z.string().transform(value => value.trim().slice(0, max));
const optionalText = (max: number) => z.string().nullable().transform(value => value?.trim().slice(0, max) || null);

export const snapshotSchema = z.object({
  v: z.literal(1),
  edition: z.string().max(20),
  pricesIncludeVat: z.boolean(),
  restaurant: z.object({ name: clipped(100), address: clipped(300), phone: clipped(30) }).nullable(),
  categories: z.array(z.object({ ref, name: text(100), description: optionalText(1000), sortOrder: z.number().int() })).max(500),
  items: z.array(z.object({
    ref, categoryRef: ref, name: text(150), description: optionalText(1000), price: rupees,
    isVeg: z.boolean(), isAvailable: z.boolean(),
    addons: z.array(z.object({ name: text(60), price: rupees })).max(200),
  })).max(5000),
});
export type MenuSnapshot = z.infer<typeof snapshotSchema>;
export type SnapshotItem = MenuSnapshot["items"][number];

export const ADDON_GROUP_NAME = "Add-ons";
const MAX_ADDON_OPTIONS = 20;

/** The QR fields RestroFuel owns. These, as last applied, are an item's `external_base`. */
export type SyncedItem = {
  categoryRef: string; name: string; description: string | null; price_minor: number;
  diet: "VEG" | null; is_available: boolean; addons: { name: string; price_minor: number }[];
};
export type ItemBase = SyncedItem & { removed?: boolean };
export type CategoryBase = { name: string };

const toMinor = (value: number) => Math.round(value * 100);

export function syncedItem(item: SnapshotItem): SyncedItem {
  return {
    categoryRef: item.categoryRef, name: item.name, description: item.description, price_minor: toMinor(item.price),
    // RestroFuel has no non-veg flag; "not veg" stays unlabelled rather than claiming non-veg.
    diet: item.isVeg ? "VEG" : null, is_available: item.isAvailable,
    addons: item.addons.slice(0, MAX_ADDON_OPTIONS).map(addon => ({ name: addon.name, price_minor: toMinor(addon.price) })),
  };
}

export const syncedFields = ["name", "description", "price_minor", "diet", "is_available", "categoryRef", "addons"] as const;
export type SyncedField = typeof syncedFields[number];

export const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
