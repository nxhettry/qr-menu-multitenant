import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_EVENTS_LIMIT, ADMIN_PAGE_SIZE, adminEventSchema, adminOverviewSchema, adminRestaurantDetailSchema,
  abuseReportRowSchema, photoReviewRowSchema, uploadLimitSchema, adminRestaurantRowSchema, adminUserDetailSchema, adminUserRowSchema, pageOf,
  type AbuseReportListQuery, type PhotoReviewListQuery, type EventListQuery, type RestaurantListQuery, type UserListQuery,
} from "./schemas";

export async function callAdmin<T extends z.ZodType>(fn: string, args: Record<string, unknown>, schema: T): Promise<z.infer<T>> {
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

export const listAbuseReports = ({ page, status }: AbuseReportListQuery) =>
  callAdmin("admin_list_abuse_reports", { p_status: status === "ALL" ? null : status, p_page: page, p_page_size: ADMIN_PAGE_SIZE }, pageOf(abuseReportRowSchema));

export const listPhotoReviews = ({ page, status }: PhotoReviewListQuery) =>
  callAdmin("admin_list_photo_reviews", { p_status: status, p_page: page, p_page_size: ADMIN_PAGE_SIZE }, pageOf(photoReviewRowSchema));

export const reviewPhoto = (id: string, decision: "APPROVE" | "REJECT", dishId: string | null) =>
  callAdmin("admin_review_photo", { p_id: id, p_decision: decision, p_dish_id: dishId }, z.null());

export const resolveAbuseReport = (id: string, status: "OPEN" | "RESOLVED" | "DISMISSED") =>
  callAdmin("admin_resolve_abuse_report", { p_id: id, p_status: status }, z.null());

export const getUploadLimit = (restaurantId: string) =>
  callAdmin("admin_get_upload_limit", { p_restaurant_id: restaurantId }, uploadLimitSchema);

export const setUploadLimit = (restaurantId: string, limit: number | null) =>
  callAdmin("admin_set_upload_limit", { p_restaurant_id: restaurantId, p_limit: limit }, z.null());

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
