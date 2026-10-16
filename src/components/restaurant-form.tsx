"use client";
import { useActionState } from "react";
import { createRestaurant } from "@/app/onboarding/actions";
import type { FormState } from "@/lib/auth/schemas";

export function RestaurantForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createRestaurant, {});
  const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3";
  return <form action={action} className="mt-8 space-y-6">
    <label className="block text-sm font-medium">Restaurant name
      <input className={inputClass} name="name" placeholder="Momo House" autoComplete="organization" maxLength={100} required />
    </label>
    <label className="block text-sm font-medium">Your menu address
      <input className={inputClass} name="slug" placeholder="momo-house-thamel" autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" required aria-describedby="slug-help" />
      <span id="slug-help" className="mt-2 block text-xs leading-5 font-normal text-stone-500">Use 3–40 lowercase letters, numbers, and hyphens. This becomes your menu’s web address.</span>
    </label>
    {state.error && <p className="text-sm leading-6 text-red-800" role="alert">{state.error}</p>}
    <button disabled={pending} className="w-full rounded-full bg-stone-900 px-6 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Creating…" : "Create restaurant"}</button>
  </form>;
}
