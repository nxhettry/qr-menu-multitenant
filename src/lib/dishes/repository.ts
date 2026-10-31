import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { ADMIN_PAGE_SIZE, type DishListQuery, type UserListQuery } from "@/lib/admin/schemas";
import { callAdmin } from "@/lib/admin/repository";
import {
  adminDishPageSchema, adminDishRowSchema, dishCandidatePageSchema, dishCatalogSchema,
  type CandidateResolution, type DishInput,
} from "./schemas";

export const DISH_CATALOG_TAG = "dishes";

/** The active catalog for every restaurant. Cookie-free and shared; admin edits expire the tag. */
export async function getDishCatalog() {
  "use cache";
  cacheLife("days");
  cacheTag(DISH_CATALOG_TAG);
  const { data, error } = await createPublicClient().rpc("get_dish_catalog");
  if (error) throw new Error("Could not load the dish catalog");
  return dishCatalogSchema.parse(data);
}

export const listAdminDishes = ({ q, page, status }: DishListQuery) =>
  callAdmin("admin_list_dishes", { p_search: q || null, p_status: status ?? null, p_page: page, p_page_size: ADMIN_PAGE_SIZE }, adminDishPageSchema);

export const listDishCandidates = ({ q, page }: UserListQuery) =>
  callAdmin("admin_list_dish_candidates", { p_search: q || null, p_page: page, p_page_size: ADMIN_PAGE_SIZE }, dishCandidatePageSchema);

export const saveAdminDish = (input: DishInput) => callAdmin("admin_save_dish", {
  p_payload: { ...input, name_ne: input.name_ne || null, category: input.category || null },
}, adminDishRowSchema);

export const mergeAdminDishes = (sourceId: string, targetId: string) =>
  callAdmin("admin_merge_dishes", { p_source: sourceId, p_target: targetId }, adminDishRowSchema);

export const resolveDishCandidate = (normalized: string, resolution: CandidateResolution) =>
  callAdmin("admin_resolve_dish_candidate", {
    p_normalized: normalized, p_action: resolution.action, p_dish_id: resolution.action === "alias" ? resolution.dishId : null,
  }, z.object({ linkedItems: z.coerce.number().int().nonnegative() }));
