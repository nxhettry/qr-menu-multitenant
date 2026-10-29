import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { getSuperAdmin } from "@/lib/admin/session";

export class TenantAccessError extends Error {
  constructor(public status: 401 | 404) { super(status === 401 ? "Sign in required" : "Restaurant not found"); }
}
export type TenantContext = {
  userId: string; restaurantId: string; role: "OWNER" | "MANAGER" | "EDITOR";
  editingLocked: boolean; actingAsAdmin: boolean;
};
export async function getTenantContext(restaurantId: string): Promise<TenantContext> {
  const user = await getVerifiedUser();
  if (!user) throw new TenantAccessError(401);
  if (!z.uuid().safeParse(restaurantId).success) throw new TenantAccessError(404);
  const supabase = await createClient();
  const { data: membership, error } = await supabase.from("memberships")
    .select("role").eq("user_id", user.id).eq("restaurant_id", restaurantId).maybeSingle();
  if (error) throw new Error("Could not verify restaurant membership");
  const actingAsAdmin = !membership && Boolean(await getSuperAdmin());
  if (!membership && !actingAsAdmin) throw new TenantAccessError(404);
  const role = membership ? z.enum(["OWNER", "MANAGER", "EDITOR"]).parse(membership.role) : "OWNER";
  const [{ data: restaurant, error: restaurantError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.from("restaurants").select("status,deleted_at").eq("id", restaurantId).maybeSingle(),
    supabase.from("subscriptions").select("editing_locked_at").eq("restaurant_id", restaurantId).maybeSingle(),
  ]);
  if (restaurantError || subscriptionError) throw new Error("Could not verify restaurant access");
  if (!restaurant || restaurant.deleted_at) throw new TenantAccessError(404);
  return { userId: user.id, restaurantId, role, actingAsAdmin,
    editingLocked: actingAsAdmin ? false : !subscription || restaurant.status === "SUSPENDED" ||
      Boolean(subscription.editing_locked_at && Date.parse(subscription.editing_locked_at) <= Date.now()),
  };
}

export function can(context: TenantContext, permission: "menu:edit" | "restaurant:manage") {
  if (context.editingLocked) return false;
  return permission === "menu:edit" || context.role === "OWNER" || context.role === "MANAGER";
}
