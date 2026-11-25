"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import type { FormState } from "@/lib/auth/schemas";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { createRestaurantFromForm } from "@/lib/tenancy/create-restaurant";
import { connectRestaurant, RestroFuelError } from "@/lib/restrofuel/service";
import { checkRateLimit, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";

async function connect(userId: string, restaurantId: string, form: FormData): Promise<FormState | null> {
  if (!(await checkRateLimit("restrofuelConnect", userId)).allowed) return { error: RATE_LIMITED_MESSAGE };
  try {
    await connectRestaurant(await getTenantContext(restaurantId), { server: form.get("server"), code: form.get("code") });
    return null;
  } catch (error) {
    if (error instanceof RestroFuelError || error instanceof TenantAccessError) return { error: error.message };
    console.error("RestroFuel connect failed", { restaurantId });
    return { error: "We couldn’t connect RestroFuel. Please try again." };
  }
}

export async function connectExistingRestaurant(_state: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const restaurantId = String(form.get("restaurantId") ?? "");
  const failed = await connect(user.id, restaurantId, form);
  if (failed) return failed;
  redirect(`/dashboard/${restaurantId}/restrofuel`);
}

export async function connectNewRestaurant(_state: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const created = await createRestaurantFromForm(form);
  if ("error" in created) return created;
  const failed = await connect(user.id, created.id, form);
  if (failed) return { error: `${failed.error} Your new restaurant was saved: reload this page and choose it to try again.` };
  redirect(`/dashboard/${created.id}/restrofuel`);
}
