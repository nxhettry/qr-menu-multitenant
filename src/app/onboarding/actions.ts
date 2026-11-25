"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import type { FormState } from "@/lib/auth/schemas";
import { createRestaurantFromForm } from "@/lib/tenancy/create-restaurant";

export async function createRestaurant(_state: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const created = await createRestaurantFromForm(form);
  if ("error" in created) return created;
  redirect("/dashboard");
}
