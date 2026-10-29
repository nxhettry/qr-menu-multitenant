"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { credentialsSchema, type FormState } from "@/lib/auth/schemas";
import { getSiteOrigin } from "@/lib/env/server";
import { authErrorMessage } from "@/lib/auth/errors";
import { assertSuperAdmin } from "@/lib/admin/session";
import { getAdminUser, logAdminUserAction, setRestaurantSuspended, type AdminUserAction } from "@/lib/admin/repository";
import { newPasswordSchema, type AdminActionState } from "@/lib/admin/schemas";
import { invalidateMenu } from "@/lib/editor/invalidation";

const notPermitted: AdminActionState = { error: "Your admin session has ended. Sign in again." };
const BAN_DURATION = "876000h";

export async function adminLogin(_state: FormState, form: FormData): Promise<FormState> {
  const input = credentialsSchema.extend({ password: z.string().min(1).max(128) })
    .safeParse({ email: String(form.get("email") ?? "").trim(), password: form.get("password") });
  if (!input.success) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);
  const { data: isAdmin } = error ? { data: false } : await supabase.rpc("is_super_admin");
  if (isAdmin !== true) {
    if (!error) await supabase.auth.signOut({ scope: "local" });
    return { error: "Could not sign in with those details." };
  }
  redirect("/admin");
}

export async function adminLogout() {
  await (await createClient()).auth.signOut({ scope: "local" });
  redirect("/admin/login");
}

export async function setRestaurantSuspendedAction(restaurantId: string, suspended: boolean): Promise<AdminActionState> {
  if (!z.uuid().safeParse(restaurantId).success) return { error: "Restaurant not found." };
  let slug;
  try {
    await assertSuperAdmin();
    slug = await setRestaurantSuspended(restaurantId, suspended);
  } catch { return { error: "Could not update the restaurant. Please try again." }; }
  try { invalidateMenu(restaurantId, { slug, previousSlug: slug }); }
  catch { console.error("Admin status change needs cache refresh", { restaurantId }); }
  refresh();
  return { message: suspended ? "Restaurant suspended. Its public menu is now unavailable." : "Restaurant restored." };
}

// Other admins' accounts are managed outside the portal so one admin cannot lock out another.
async function managedUser(userId: string) {
  if (!z.uuid().safeParse(userId).success) return null;
  const admin = await assertSuperAdmin();
  const user = await getAdminUser(userId);
  return user && !user.isSuperAdmin && user.id !== admin.id ? user : null;
}

async function runUserAction(userId: string, action: AdminUserAction, run: (user: NonNullable<Awaited<ReturnType<typeof managedUser>>>) => Promise<string | undefined>, message: string): Promise<AdminActionState> {
  let user;
  try { user = await managedUser(userId); }
  catch { return notPermitted; }
  if (!user) return { error: "This account can’t be changed from the admin portal." };
  try {
    const error = await run(user);
    if (error) return { error };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Add SUPABASE_SECRET_KEY on the server to enable account changes." };
    console.error(`[admin:${action}]`);
    return { error: "Could not update the account. Please try again." };
  }
  try { await logAdminUserAction(user.id, action); }
  catch { console.error("Admin action could not be logged", { action }); }
  refresh();
  return { message };
}

export async function setUserPasswordAction(userId: string, _state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const password = newPasswordSchema.safeParse(form.get("password"));
  if (!password.success) return { error: "Use a password of 8–128 characters." };
  return runUserAction(userId, "admin.user.password_set", async user => {
    const { error } = await createServiceClient().auth.admin.updateUserById(user.id, { password: password.data });
    return error ? authErrorMessage("admin-password", error, "Could not set the password. Try a stronger one.") : undefined;
  }, "Password updated. Share it with the account owner securely.");
}

export async function setUserBannedAction(userId: string, banned: boolean): Promise<AdminActionState> {
  return runUserAction(userId, banned ? "admin.user.banned" : "admin.user.unbanned", async user => {
    const { error } = await createServiceClient().auth.admin.updateUserById(user.id, { ban_duration: banned ? BAN_DURATION : "none" });
    return error ? "Could not change sign-in access. Please try again." : undefined;
  }, banned ? "Sign-in disabled. Existing sessions end within an hour." : "Sign-in enabled.");
}

export async function sendUserResetAction(userId: string): Promise<AdminActionState> {
  return runUserAction(userId, "admin.user.reset_sent", async user => {
    if (!user.email) return "This account has no email address.";
    const { error } = await (await createClient()).auth.resetPasswordForEmail(user.email, {
      redirectTo: `${getSiteOrigin()}/auth/callback?next=/reset-password`,
    });
    return error ? authErrorMessage("admin-reset", error, "Could not send the reset email. Please try again shortly.") : undefined;
  }, "Password reset email sent.");
}

export async function changeOwnPasswordAction(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const password = newPasswordSchema.safeParse(form.get("password"));
  if (!password.success || password.data !== form.get("confirmation")) return { error: "Use 8–128 characters and make sure both new passwords match." };
  let admin;
  try { admin = await assertSuperAdmin(); }
  catch { return notPermitted; }
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: admin.email ?? "", password: String(form.get("current") ?? "") });
  if (verifyError) return { error: "Your current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: authErrorMessage("admin-own-password", error, "Could not update your password. Try a different one.") };
  return { message: "Your password has been updated." };
}
