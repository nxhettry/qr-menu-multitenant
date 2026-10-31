import { z } from "zod";
import { pageOf } from "../admin/schemas.ts";

export const catalogDishSchema = z.object({
  id: z.uuid(), name: z.string(), nameNe: z.string().nullable(), category: z.string().nullable(), aliases: z.array(z.string()),
});
export const dishCatalogSchema = z.array(catalogDishSchema);
export type CatalogDish = z.infer<typeof catalogDishSchema>;

const text = (max: number) => z.string().trim().max(max);
const list = (maxItems: number, maxLength: number) => z.array(text(maxLength)).max(maxItems);
export const dishStatus = z.enum(["ACTIVE", "HIDDEN"]);
export const dishInput = z.object({
  id: z.uuid().optional(), name: text(150).min(1, "Enter the dish name."), name_ne: text(150).nullable().optional(),
  category: text(100).nullable().optional(), aliases: list(30, 150), tags: list(20, 50), status: dishStatus,
});
export type DishInput = z.infer<typeof dishInput>;

export const adminDishRowSchema = z.object({
  id: z.uuid(), slug: z.string().nullable(), name: z.string(), nameNe: z.string().nullable(), category: z.string().nullable(),
  aliases: z.array(z.string()), tags: z.array(z.string()), status: dishStatus, updatedAt: z.string(), itemCount: z.coerce.number().int().nonnegative(),
});
export type AdminDishRow = z.infer<typeof adminDishRowSchema>;
export const adminDishPageSchema = pageOf(adminDishRowSchema);

export const dishCandidateRowSchema = z.object({
  normalized: z.string(), name: z.string(), restaurantCount: z.coerce.number().int().nonnegative(), lastSeenAt: z.string(),
});
export type DishCandidateRow = z.infer<typeof dishCandidateRowSchema>;
export const dishCandidatePageSchema = pageOf(dishCandidateRowSchema);

export const candidateResolution = z.discriminatedUnion("action", [
  z.object({ action: z.literal("alias"), dishId: z.uuid() }),
  z.object({ action: z.literal("dish") }),
  z.object({ action: z.literal("dismiss") }),
]);
export type CandidateResolution = z.infer<typeof candidateResolution>;
