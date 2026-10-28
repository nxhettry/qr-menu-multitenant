import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy/context";
import { can } from "@/lib/tenancy/context";
import { editorDataSchema } from "./data";
import type { EditorMutation } from "./schemas";
import { z } from "zod";

export class MenuEditError extends Error {}

export async function getEditorData(context: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_editor_menu", { p_restaurant_id: context.restaurantId });
  if (error || !data) throw new MenuEditError("We couldn’t load your menu. Please try again.");
  return editorDataSchema.parse(data);
}

export async function getRestaurantLink(context: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("restaurants").select("slug,short_code").eq("id", context.restaurantId).single();
  if (error || !data) throw new MenuEditError("We couldn’t load your menu link. Please try again.");
  return z.object({ slug: z.string(), short_code: z.string().regex(/^[A-Za-z0-9_-]{7}$/) }).parse(data);
}

export function requiresManagement(input: EditorMutation) {
  return input.operation === "settings" || input.operation === "visibility" || input.operation === "displaySettings" ||
    (input.operation === "removeImage" && input.payload.kind !== "item");
}

const mutationReceipt = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/), previousSlug: z.string(), id: z.string().nullable().optional(), uploadId: z.uuid().optional(), publicId: z.string().optional() });
const safeMessages = new Set([
  "An item with this category and name already exists", "Import request changed. Choose the file again", "Use a top-level category as the parent",
  "Remove or move subcategories first", "Add a visible item before publishing", "Invalid item details",
  "Choose up to six specials for your banner",
  "Confirm the example prices before saving", "Confirm every example price before publishing",
  "Add an item to a visible category before publishing", "Move or remove the items in this category first",
  "The menu changed. Refresh before reordering", "Category limit reached", "Item limit reached",
  "Daily image upload limit reached. Try again tomorrow", "Confirm example prices before adding them to a published menu",
]);

export async function executeMenuMutation(context: TenantContext, operation: string, payload: unknown, management = false) {
  if (!can(context, management ? "restaurant:manage" : "menu:edit")) throw new MenuEditError("You don’t have permission to make this change, or editing is locked.");
  const { data, error } = await (await createClient()).rpc("mutate_menu", {
    p_restaurant_id: context.restaurantId, p_operation: operation, p_payload: payload,
  });
  if (error) {
    if (error.code === "P0002") throw new MenuEditError("The menu entry was not found. Refresh your menu.");
    if (error.code === "42501") throw new MenuEditError("You don’t have permission to make this change, or editing is locked.");
    if (error.code === "23505") throw new MenuEditError("That menu address is already reserved. Choose another.");
    if (safeMessages.has(error.message)) throw new MenuEditError(error.message);
    console.error("Menu mutation failed", { code: error.code });
    throw new MenuEditError("We couldn’t save this change. Your previous menu is still intact.");
  }
  return mutationReceipt.parse(data);
}
