import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy/context";
import { photoOptionsSchema } from "./schemas";

export async function findReusableAssetId(context: TenantContext, sha256: string) {
  const { data, error } = await (await createClient()).rpc("find_reusable_asset", { p_restaurant_id: context.restaurantId, p_sha256: sha256 });
  if (error) throw new Error("Could not check existing photos");
  return z.object({ id: z.uuid() }).nullable().parse(data)?.id ?? null;
}

export async function listPhotoOptions(context: TenantContext, itemId: string) {
  const { data, error } = await (await createClient()).rpc("list_photo_options", { p_restaurant_id: context.restaurantId, p_item_id: itemId });
  if (error) throw new Error("Could not load photos");
  return photoOptionsSchema.parse(data);
}
