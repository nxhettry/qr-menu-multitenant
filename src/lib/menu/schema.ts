import { z } from "zod";

const text = z.string().nullable();
const assetVersion = z.number().int().positive().nullable();
const price = z.number().int().min(0).max(1000000000);
const variantSchema = z.object({
  id: z.uuid(), name: z.string(), nameNe: text, priceMinor: price, isAvailable: z.boolean(),
});
const itemSchema = z.object({
  id: z.uuid(), name: z.string(), nameNe: text, description: text, descriptionNe: text,
  priceMinor: price.nullable(), imagePublicId: text, imageVersion: assetVersion,
  isAvailable: z.boolean(), diet: z.enum(["VEG", "NON_VEG", "EGG"]).nullable(),
  spiceLevel: z.number().int().min(0).max(3).nullable(), variants: z.array(variantSchema),
});
export const publishedMenuSchema = z.object({
  status: z.literal("PUBLISHED"), id: z.string(), slug: z.string(), shortCode: z.string(),
  name: z.string(), nameNe: text, description: text, address: text, phone: text, mapUrl: text,
  themeColor: z.string(), logoPublicId: text, logoVersion: assetVersion,
  coverPublicId: text, coverVersion: assetVersion, openingHours: z.record(z.string(), z.unknown()),
  currency: z.literal("NPR"), pricesIncludeVat: z.boolean(),
  vatPercent: z.number().min(0).max(100), serviceChargePercent: z.number().min(0).max(100),
  updatedAt: z.iso.datetime({ offset: true }),
  categories: z.array(z.object({ id: z.uuid(), name: z.string(), nameNe: text, items: z.array(itemSchema) })),
});
export const publicMenuSchema = z.union([
  publishedMenuSchema, z.object({ status: z.literal("UNAVAILABLE") }), z.null(),
]);
export type PublishedMenu = z.infer<typeof publishedMenuSchema>;
export type PublicMenu = z.infer<typeof publicMenuSchema>;
export type MenuItem = PublishedMenu["categories"][number]["items"][number];
