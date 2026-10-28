"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema, type FormState } from "@/lib/auth/schemas";
import { getSiteOrigin } from "@/lib/env/server";
import { authErrorMessage } from "@/lib/auth/errors";
export async function login(_state: FormState, form: FormData): Promise<FormState> {
  const input = credentialsSchema.extend({ password: z.string().min(1).max(128) })
    .safeParse({ email: String(form.get("email") ?? "").trim(), password: form.get("password") });
  if (!input.success) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error) return { error: "Could not sign in. Check your details and verify your email." };
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
export async function register(_state: FormState, form: FormData): Promise<FormState> {
  const input = credentialsSchema.safeParse({ email: String(form.get("email") ?? "").trim(), password: form.get("password") });
  if (!input.success) return { error: "Enter a valid email and a password of 8–128 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ ...input.data,
    options: { emailRedirectTo: `${getSiteOrigin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: authErrorMessage("register", error, "Could not create the account. Please try again shortly.") };
  if (data.session) redirect("/onboarding");
  return { message: "Check your email for the confirmation link. If you already have an account, sign in or reset your password." };
}
export async function requestPasswordReset(_state: FormState, form: FormData): Promise<FormState> {
  const email = z.email().max(254).safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${getSiteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: authErrorMessage("password-reset", error, "Could not request a reset. Please try again shortly.") };
  return { message: "If an account exists for that email, you’ll receive a password reset link." };
}
export async function resetPassword(_state: FormState, form: FormData): Promise<FormState> {
  const password = z.string().min(8).max(128).safeParse(form.get("password"));
  if (!password.success || password.data !== form.get("confirmation")) return { error: "Use 8–128 characters and make sure both passwords match." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Open the link from your reset email first. If it expired, request a new one." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "Could not update the password. Please try a different password or request a new link." };
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not sign out. Please try again.");
  revalidatePath("/dashboard", "layout");
  redirect("/login");
}
