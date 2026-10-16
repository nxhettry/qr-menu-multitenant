"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestPasswordReset, resetPassword } from "@/app/auth/actions";
import type { FormState } from "@/lib/auth/schemas";

const modes = {
  login: { title: "Welcome back.", description: "Sign in to manage your restaurant’s menu.", button: "Sign in", action: login },
  register: { title: "Your next menu starts here.", description: "Create an account, then make it yours.", button: "Create account", action: register },
  forgot: { title: "Let’s get you back in.", description: "We’ll email you a link to reset your password.", button: "Send reset link", action: requestPasswordReset },
  reset: { title: "Choose a new password.", description: "Use at least eight characters to protect your account.", button: "Save password", action: resetPassword },
};
export function AuthForm({ mode, confirmationError = false }: { mode: keyof typeof modes; confirmationError?: boolean }) {
  const config = modes[mode];
  const [state, action, pending] = useActionState<FormState, FormData>(config.action, {});
  const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3";
  return <main className="mx-auto w-full max-w-md px-6 py-14">
    <Link href="/" className="font-bold">qrmenu<span className="text-orange-700">.</span></Link>
    <h1 className="mt-12 font-serif text-4xl">{config.title}</h1>
    <p className="mt-4 leading-7 text-stone-600">{config.description}</p>
    {confirmationError && <p role="alert" className="mt-5 text-sm text-red-800">That confirmation link could not be used. Try signing in, or request a new reset link.</p>}
    <form action={action} className="mt-8 space-y-5">
      {mode !== "reset" && <label className="block text-sm font-medium">Email<input className={inputClass} name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
      {mode !== "forgot" && <label className="block text-sm font-medium">Password<input className={inputClass} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 8} maxLength={128} required /></label>}
      {mode === "reset" && <label className="block text-sm font-medium">Confirm password<input className={inputClass} name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>}
      {state.error && <p role="alert" className="text-sm leading-6 text-red-800">{state.error}</p>}
      {state.message && <p role="status" className="text-sm leading-6 text-green-800">{state.message}</p>}
      <button disabled={pending} className="w-full rounded-full bg-stone-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Please wait…" : config.button}</button>
    </form>
    <div className="mt-7 flex flex-wrap justify-between gap-4 text-sm text-orange-800">
      {mode === "login" ? <><Link href="/register">Create an account</Link><Link href="/forgot-password">Forgot password?</Link></> : <Link href="/login">Back to sign in</Link>}
    </div>
  </main>;
}
