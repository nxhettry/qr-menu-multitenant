import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const restaurant = z.object({ id: z.uuid(), name: z.string(), slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "SUSPENDED"]) });
export type RestaurantSummary = z.infer<typeof restaurant>;

// The caller must supply a verified server user ID, never a query-string ID.
export async function listRestaurantsForUser(userId: string): Promise<RestaurantSummary[]> {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase.from("memberships")
    .select("restaurant_id").eq("user_id", userId);
  if (error) throw new Error("Could not load restaurant memberships");
  if (!memberships?.length) return [];
  const { data, error: restaurantError } = await supabase.from("restaurants")
    .select("id,name,slug,status").in("id", memberships.map(m => m.restaurant_id))
    .is("deleted_at", null).order("created_at", { ascending: true });
  if (restaurantError) throw new Error("Could not load restaurants");
  return z.array(restaurant).parse(data);
}
