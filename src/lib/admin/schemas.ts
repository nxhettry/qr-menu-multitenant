import { z } from "zod";

export const ADMIN_PAGE_SIZE = 20;
export const ADMIN_EVENTS_LIMIT = 25;

const timestamp = z.string();
const nullableTimestamp = timestamp.nullable();
const count = z.coerce.number().int().nonnegative();
export const restaurantStatus = z.enum(["DRAFT", "PUBLISHED", "SUSPENDED"]);
export type RestaurantStatus = z.infer<typeof restaurantStatus>;

export const adminOverviewSchema = z.object({
  users: z.object({ total: count, verified: count, banned: count, new7: count, new30: count }),
  restaurants: z.object({ total: count, published: count, draft: count, suspended: count, new7: count, new30: count }),
  scans: z.object({ today: count, week: count, month: count }),
  items: count,
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;

export const adminUserRowSchema = z.object({
  id: z.uuid(), email: z.string().nullable(), createdAt: timestamp, lastSignInAt: nullableTimestamp,
  emailConfirmedAt: nullableTimestamp, bannedUntil: nullableTimestamp, isSuperAdmin: z.boolean(), restaurantCount: count,
});
export type AdminUserRow = z.infer<typeof adminUserRowSchema>;

export const adminRestaurantRowSchema = z.object({
  id: z.uuid(), name: z.string(), slug: z.string(), shortCode: z.string(), status: restaurantStatus,
  createdAt: timestamp, updatedAt: timestamp, ownerEmail: z.string().nullable(),
  categoryCount: count, itemCount: count, scans30: count,
});
export type AdminRestaurantRow = z.infer<typeof adminRestaurantRowSchema>;

export const pageOf = <T extends z.ZodType>(row: T) => z.object({ total: count, rows: z.array(row) });
export type AdminPage<T> = { total: number; rows: T[] };

export const adminUserDetailSchema = adminUserRowSchema.omit({ restaurantCount: true }).extend({
  termsVersion: z.string().nullable(), termsAcceptedAt: nullableTimestamp,
  restaurants: z.array(z.object({ id: z.uuid(), name: z.string(), slug: z.string(), status: restaurantStatus, role: z.string() })),
});
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;

export const adminRestaurantDetailSchema = z.object({
  id: z.uuid(), name: z.string(), nameNe: z.string().nullable(), slug: z.string(), shortCode: z.string(), status: restaurantStatus,
  description: z.string().nullable(), phone: z.string().nullable(), address: z.string().nullable(),
  createdAt: timestamp, updatedAt: timestamp, publishedAt: nullableTimestamp,
  subscription: z.object({ plan: z.string(), status: z.string(), trialEndsAt: timestamp }).nullable(),
  members: z.array(z.object({ userId: z.uuid(), email: z.string().nullable(), role: z.string() })),
  categoryCount: count, itemCount: count,
  scans: z.object({ today: count, week: count, month: count, total: count }),
});
export type AdminRestaurantDetail = z.infer<typeof adminRestaurantDetailSchema>;

export const adminEventSchema = z.object({
  id: z.uuid(), action: z.string(), createdAt: timestamp, metadata: z.record(z.string(), z.unknown()),
  restaurantId: z.uuid().nullable(), restaurantName: z.string().nullable(), actorEmail: z.string().nullable(),
});
export type AdminEvent = z.infer<typeof adminEventSchema>;

const search = z.string().trim().max(100).catch("");
const page = z.coerce.number().int().min(1).max(10_000).catch(1);
export const userListQuery = z.object({ q: search, page });
export const restaurantListQuery = z.object({ q: search, page, status: restaurantStatus.optional().catch(undefined) });
export const eventListQuery = z.object({
  restaurantId: z.uuid().optional().catch(undefined),
  beforeAt: z.iso.datetime({ offset: true }).optional().catch(undefined),
  beforeId: z.uuid().optional().catch(undefined),
});
export type UserListQuery = z.infer<typeof userListQuery>;
export type RestaurantListQuery = z.infer<typeof restaurantListQuery>;
export type EventListQuery = z.infer<typeof eventListQuery>;

export const newPasswordSchema = z.string().min(8, "Use at least 8 characters").max(128);
export type AdminActionState = { error?: string; message?: string };
