"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestPasswordReset, resetPassword } from "@/app/auth/actions";
import { adminLogin } from "@/app/admin/actions";
import type { FormState } from "@/lib/auth/schemas";
import { AuthShell } from "./ui/auth-shell";
import { checkboxClass, Field, FormError, inputClass, linkClass, noticeClass, primaryClass } from "./ui/form";

const modes = {
  login: { title: "Welcome back.", description: "Sign in to manage your restaurant’s menu.", button: "Sign in", action: login },
  register: { title: "Your next menu starts here.", description: "Create a free account, then make it yours.", button: "Create account", action: register },
  forgot: { title: "Let’s get you back in.", description: "We’ll email you a link to reset your password.", button: "Send reset link", action: requestPasswordReset },
  reset: { title: "Choose a new password.", description: "Use at least eight characters to protect your account.", button: "Save password", action: resetPassword },
  admin: { title: "Platform admin.", description: "Sign in with a super-admin account.", button: "Sign in", action: adminLogin },
};
export function AuthForm({ mode, confirmationError = false }: { mode: keyof typeof modes; confirmationError?: boolean }) {
  const config = modes[mode];
  const [state, action, pending] = useActionState<FormState, FormData>(config.action, {});
  const footer = mode === "admin" ? undefined : mode === "login"
    ? <div className="flex flex-wrap justify-between gap-4"><span className="text-ink-muted">New here? <Link href="/register" className={linkClass}>Create an account</Link></span><Link href="/forgot-password" className={linkClass}>Forgot password?</Link></div>
    : <p className="text-center text-ink-muted">{mode === "register" ? "Already have an account? " : ""}<Link href="/login" className={linkClass}>{mode === "register" ? "Sign in" : "Back to sign in"}</Link></p>;
  return <AuthShell eyebrow={mode === "admin" ? "Super admin" : undefined} title={config.title} description={config.description} footer={footer}>
    {confirmationError && <p role="alert" className={`${noticeClass("danger")} mt-5`}>That confirmation link could not be used. Try signing in, or request a new reset link.</p>}
    <form action={action} className="mt-7 space-y-5">
      {mode !== "reset" && <Field label="Email"><input className={inputClass} name="email" type="email" autoComplete="email" required maxLength={254} /></Field>}
      {mode !== "forgot" && <Field label="Password"><input className={inputClass} name="password" type="password" autoComplete={mode === "login" || mode === "admin" ? "current-password" : "new-password"} minLength={mode === "login" || mode === "admin" ? 1 : 8} maxLength={128} required /></Field>}
      {mode === "register" && <label className="flex items-start gap-3 text-sm leading-6 text-ink-muted"><input className={`${checkboxClass} mt-0.5`} name="acceptTerms" type="checkbox" required />
        <span>I agree to the <Link href="/terms" target="_blank" className={linkClass}>Terms of Service</Link> and <Link href="/privacy" target="_blank" className={linkClass}>Privacy Policy</Link>.</span></label>}
      {mode === "reset" && <Field label="Confirm password"><input className={inputClass} name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></Field>}
      <FormError message={state.error} />
      {state.message && <p role="status" className={noticeClass("success")}>{state.message}</p>}
      <button disabled={pending} className={`${primaryClass} w-full`}>{pending ? "Please wait…" : config.button}</button>
    </form>
  </AuthShell>;
}
