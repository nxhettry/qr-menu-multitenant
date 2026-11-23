"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/auth/session";
import type { FormState } from "@/lib/auth/schemas";
import { DELETION_CONFIRMATION } from "@/lib/account/constants";
import { cancelAccountDeletion, requestAccountDeletion } from "@/lib/account/repository";
import { invalidateMenu } from "@/lib/editor/invalidation";
import { checkRateLimit, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";

export async function requestAccountDeletionAction(_state: FormState, form: FormData): Promise<FormState> {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  if (String(form.get("confirmation") ?? "").trim() !== DELETION_CONFIRMATION) return { error: `Type ${DELETION_CONFIRMATION} to confirm.` };
  if (!(await checkRateLimit("accountDeletion", user.id)).allowed) return { error: RATE_LIMITED_MESSAGE };
  let released;
  try { released = await requestAccountDeletion(); }
  catch { return { error: "We couldn’t schedule the deletion. Please try again." }; }
  for (const { id, slug } of released) {
    try { invalidateMenu(id, { slug, previousSlug: slug }); }
    catch { console.error("Deleted menu needs cache refresh", { restaurantId: id }); }
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/account");
}

export async function cancelAccountDeletionAction(): Promise<void> {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  if (!(await checkRateLimit("accountDeletion", user.id)).allowed) return;
  try { await cancelAccountDeletion(); }
  catch { console.error("Account deletion could not be cancelled"); }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/account");
}
