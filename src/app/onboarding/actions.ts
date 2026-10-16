"use server";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { restaurantSchema, type FormState } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

export async function createRestaurant(_state: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const input = restaurantSchema.safeParse({ name: form.get("name"), slug: form.get("slug") });
  if (!input.success) return { error: input.error.issues[0].message };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_restaurant", { p_name: input.data.name, p_slug: input.data.slug });
  if (error) {
    if (error.code === "23505") return { error: "That address is already reserved. Choose another." };
    if (error.code === "42501") return { error: "Verify your email before creating a restaurant." };
    return { error: "We couldn’t create your restaurant. Please try again." };
  }
  updateTag(`menu:${id}`);
  updateTag(`menu-slug:${input.data.slug}`);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
