"use client";
import { useActionState } from "react";
import { createRestaurant } from "@/app/onboarding/actions";
import type { FormState } from "@/lib/auth/schemas";
import { Field, FormError, Hint, inputClass, primaryClass } from "./ui/form";

export function RestaurantForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createRestaurant, {});
  return <form action={action} className="mt-7 space-y-5">
    <Field label="Restaurant name">
      <input className={inputClass} name="name" placeholder="Momo House" autoComplete="organization" maxLength={100} required />
    </Field>
    <Field label="Your menu address">
      <input className={inputClass} name="slug" placeholder="momo-house-thamel" autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" required aria-describedby="slug-help" />
      <Hint id="slug-help">Use 3–40 lowercase letters, numbers, and hyphens. This becomes your menu’s web address.</Hint>
    </Field>
    <FormError message={state.error} />
    <button disabled={pending} className={`${primaryClass} w-full`}>{pending ? "Creating…" : "Create restaurant"}</button>
  </form>;
}
