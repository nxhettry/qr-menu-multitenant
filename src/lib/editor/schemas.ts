import { z } from "zod";
import { restaurantSchema } from "../auth/schemas.ts";

const optionalText = (max: number) => z.string().trim().max(max).nullable();
const money = z.number().int().min(0).max(1000000000);
const identity = { id: z.uuid().optional() };
export const categoryInput = z.object({ ...identity, name: z.string().trim().min(1).max(100), name_ne: optionalText(100), is_visible: z.boolean() });
export const variantInput = z.object({ name: z.string().trim().min(1).max(100), name_ne: optionalText(100), price_minor: money, is_available: z.boolean() });
export const itemInput = z.object({
  ...identity, category_id: z.uuid(), name: z.string().trim().min(1).max(150), name_ne: optionalText(150),
  description: optionalText(1000), description_ne: optionalText(1000),
  price_minor: money.nullable(), variants: z.array(variantInput).max(30),
  is_available: z.boolean(), diet: z.enum(["VEG", "NON_VEG", "EGG"]).nullable(),
  spice_level: z.number().int().min(0).max(3).nullable(), confirm_prices: z.boolean(),
}).refine(item => item.variants.length ? item.price_minor === null : item.price_minor !== null, { message: "Enter one price or at least one variant." });
export const settingsInput = restaurantSchema.extend({
  name_ne: optionalText(100), description: optionalText(1000), phone: optionalText(30), address: optionalText(300),
  map_url: z.union([z.literal(""), z.url().max(1000).refine(value => {
    const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password;
  }, "Use an HTTPS map URL without a username or password.")]).nullable(),
  theme_color: z.string().regex(/^#[0-9a-f]{6}$/i), prices_include_vat: z.boolean(),
  vat_percent: z.number().min(0).max(100), service_charge_percent: z.number().min(0).max(100),
  opening_hours: z.record(z.string().min(1).max(40), z.string().max(100)).refine(value => Object.keys(value).length <= 14),
});
export const editorMutation = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("saveCategory"), payload: categoryInput }),
  z.object({ operation: z.literal("saveItem"), payload: itemInput }),
  z.object({ operation: z.literal("settings"), payload: settingsInput }),
  z.object({ operation: z.literal("visibility"), payload: z.object({ published: z.boolean() }) }),
  z.object({ operation: z.literal("delete"), payload: z.object({ kind: z.enum(["category", "item"]), id: z.uuid() }) }),
  z.object({ operation: z.literal("availability"), payload: z.object({ id: z.uuid(), available: z.boolean() }) }),
  z.object({ operation: z.literal("reorder"), payload: z.object({ kind: z.enum(["category", "item"]), category_id: z.uuid().optional(), ids: z.array(z.uuid()).max(1000).refine(ids => new Set(ids).size === ids.length) }) }),
  z.object({ operation: z.literal("removeImage"), payload: z.object({ kind: z.enum(["logo", "cover", "item"]), item_id: z.uuid().optional() }) }),
]);
export type EditorMutation = z.infer<typeof editorMutation>;
export type CategoryInput = z.infer<typeof categoryInput>;
export type ItemInput = z.infer<typeof itemInput>;
export type SettingsInput = z.infer<typeof settingsInput>;
export type MutationResult = { error?: string; message?: string; warning?: string };

export function parsePrice(value: string) {
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Use a nonnegative price with up to two decimal places.");
  const price = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (price > 1000000000) throw new Error("Price must be at most Rs 1,00,00,000.");
  return price;
}

export function priceInputValue(value: number | null) {
  return value === null ? "" : `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}
