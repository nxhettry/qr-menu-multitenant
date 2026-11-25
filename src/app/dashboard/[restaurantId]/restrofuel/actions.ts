"use server";
import { z } from "zod";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { invalidateMenu } from "@/lib/editor/invalidation";
import { MenuEditError } from "@/lib/editor/repository";
import type { MutationResult } from "@/lib/editor/schemas";
import { applySync, disconnectRestaurant, dismissSync, RestroFuelError } from "@/lib/restrofuel/service";
import { checkRateLimit, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";

const applyInput = z.object({ snapshotId: z.uuid(), mode: z.enum(["merge", "replace"]), publish: z.boolean() });

function failure(error: unknown, fallback: string): MutationResult {
  if (error instanceof MenuEditError || error instanceof RestroFuelError || error instanceof TenantAccessError) return { error: error.message };
  console.error(fallback);
  return { error: fallback };
}

export async function applySyncAction(restaurantId: string, input: unknown): Promise<MutationResult> {
  const parsed = applyInput.safeParse(input);
  if (!parsed.success) return { error: "Choose how to apply the RestroFuel menu." };
  let receipt;
  try {
    const context = await getTenantContext(restaurantId);
    if (!(await checkRateLimit("menuImport", context.userId)).allowed) return { error: RATE_LIMITED_MESSAGE };
    receipt = await applySync(context, parsed.data);
  } catch (error) {
    return failure(error, "We couldn’t apply the RestroFuel menu. Your menu is unchanged.");
  }
  try { invalidateMenu(restaurantId, receipt); }
  catch { return { message: "Applied.", warning: "Your menu is updated, but the public menu refresh is delayed. Check it again shortly." }; }
  return { message: "Applied." };
}

export async function dismissSyncAction(restaurantId: string, snapshotId: unknown): Promise<MutationResult> {
  if (!z.uuid().safeParse(snapshotId).success) return { error: "Refresh the page and try again." };
  try {
    await dismissSync(await getTenantContext(restaurantId), snapshotId as string);
    return { message: "Dismissed." };
  } catch (error) {
    return failure(error, "We couldn’t dismiss this update. Please try again.");
  }
}

export async function disconnectAction(restaurantId: string): Promise<MutationResult> {
  try {
    await disconnectRestaurant(await getTenantContext(restaurantId));
    return { message: "Disconnected." };
  } catch (error) {
    return failure(error, "We couldn’t disconnect RestroFuel. Please try again.");
  }
}
