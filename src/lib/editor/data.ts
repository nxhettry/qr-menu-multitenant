import { z } from "zod";
import { itemDetailsSchema, displayFieldSchema } from "../menu/details.ts";

const nullableText = z.string().nullable();
const nullableVersion = z.number().int().nullable();
export const editorVariantSchema = z.object({
  id: z.uuid(), name: z.string(), name_ne: nullableText, price_minor: z.number().int(), is_available: z.boolean(), sort_order: z.number().int(),
});
export const editorItemSchema = z.object({
  id: z.uuid(), category_id: z.uuid(), name: z.string(), name_ne: nullableText, description: nullableText, description_ne: nullableText,
  price_minor: z.number().int().nullable(), is_available: z.boolean(), is_visible: z.boolean().default(true), details: itemDetailsSchema.default(() => itemDetailsSchema.parse({})), is_featured: z.boolean().default(false), uses_variants: z.boolean(), is_example_price: z.boolean(),
  image_public_id: nullableText, image_version: nullableVersion, diet: z.enum(["VEG", "NON_VEG", "EGG"]).nullable(),
  spice_level: z.number().int().nullable(), sort_order: z.number().int(), variants: z.array(editorVariantSchema),
});
export const editorCategorySchema = z.object({
  id: z.uuid(), parent_id: z.uuid().nullable().default(null), name: z.string(), name_ne: nullableText, is_visible: z.boolean(), sort_order: z.number().int(), items: z.array(editorItemSchema),
});
export const editorRestaurantSchema = z.object({
  id: z.uuid(), name: z.string(), name_ne: nullableText, slug: z.string(), short_code: z.string(),
  description: nullableText, phone: nullableText, address: nullableText, map_url: nullableText,
  theme_color: z.string(), hidden_fields: z.array(displayFieldSchema).default([]), opening_hours: z.record(z.string(), z.unknown()), prices_include_vat: z.boolean(),
  vat_percent: z.number(), service_charge_percent: z.number(), status: z.enum(["DRAFT", "PUBLISHED", "SUSPENDED"]),
  logo_public_id: nullableText, logo_version: nullableVersion, cover_public_id: nullableText, cover_version: nullableVersion, updated_at: z.string(),
});
export const editorDataSchema = z.object({ restaurant: editorRestaurantSchema, categories: z.array(editorCategorySchema) });
export type EditorData = z.infer<typeof editorDataSchema>;
export type EditorCategory = z.infer<typeof editorCategorySchema>;
export type EditorItem = z.infer<typeof editorItemSchema>;
export type EditorRestaurant = z.infer<typeof editorRestaurantSchema>;
