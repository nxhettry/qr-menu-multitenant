import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_EVENTS_LIMIT, ADMIN_PAGE_SIZE, adminEventSchema, adminOverviewSchema, adminRestaurantDetailSchema,
  adminRestaurantRowSchema, adminUserDetailSchema, adminUserRowSchema, pageOf,
  type EventListQuery, type RestaurantListQuery, type UserListQuery,
} from "./schemas";

async function callAdmin<T extends z.ZodType>(fn: string, args: Record<string, unknown>, schema: T): Promise<z.infer<T>> {
  const { data, error } = await (await createClient()).rpc(fn, args);
  if (error) {
    if (error.code !== "42501") console.error(`[admin:${fn}]`, error.code);
    throw new Error("Could not load admin data");
  }
  return schema.parse(data);
}

export const getAdminOverview = () => callAdmin("admin_overview", {}, adminOverviewSchema);

export const listAdminUsers = ({ q, page }: UserListQuery) =>
  callAdmin("admin_list_users", { p_search: q || null, p_page: page, p_page_size: ADMIN_PAGE_SIZE }, pageOf(adminUserRowSchema));

export const listAdminRestaurants = ({ q, page, status }: RestaurantListQuery) =>
  callAdmin("admin_list_restaurants", { p_search: q || null, p_status: status ?? null, p_page: page, p_page_size: ADMIN_PAGE_SIZE }, pageOf(adminRestaurantRowSchema));

export const getAdminUser = (userId: string) =>
  callAdmin("admin_get_user", { p_user_id: userId }, adminUserDetailSchema.nullable());

export const getAdminRestaurant = (restaurantId: string) =>
  callAdmin("admin_get_restaurant", { p_restaurant_id: restaurantId }, adminRestaurantDetailSchema.nullable());

export const listAdminEvents = ({ restaurantId, beforeAt, beforeId }: EventListQuery) =>
  callAdmin("admin_list_events", {
    p_restaurant_id: restaurantId ?? null, p_before_at: beforeAt ?? null, p_before_id: beforeId ?? null, p_limit: ADMIN_EVENTS_LIMIT,
  }, z.array(adminEventSchema));

export async function setRestaurantSuspended(restaurantId: string, suspended: boolean) {
  return callAdmin("admin_set_restaurant_suspended", { p_restaurant_id: restaurantId, p_suspended: suspended }, z.string());
}

export type AdminUserAction = "admin.user.password_set" | "admin.user.banned" | "admin.user.unbanned" | "admin.user.reset_sent";
export async function logAdminUserAction(userId: string, action: AdminUserAction) {
  await callAdmin("admin_log_user_action", { p_user_id: userId, p_action: action }, z.unknown());
}
