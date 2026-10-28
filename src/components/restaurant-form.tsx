"use client";
import { useActionState, useState } from "react";
import { createRestaurant } from "@/app/onboarding/actions";
import type { FormState } from "@/lib/auth/schemas";
import { suggestSlug } from "@/lib/menu/slugs";
import { useSlugAvailability, type SlugStatus } from "@/hooks/use-slug-availability";
import { Field, FormError, inputClass, primaryClass } from "./ui/form";

const statusText = (status: SlugStatus, host: string, slug: string) => ({
  idle: ["text-ink-subtle", "Use 3–40 lowercase letters, numbers, and hyphens. This becomes your menu’s web address."],
  invalid: ["text-ink-subtle", "Use 3–40 lowercase letters, numbers, and hyphens, starting and ending with a letter or number."],
  checking: ["text-ink-subtle", "Checking availability…"],
  available: ["text-success", `✓ ${host}/${slug} is available`],
  taken: ["text-danger", `That address is taken. Try adding your area, like ${slug}-thamel.`],
  error: ["text-ink-subtle", "We couldn’t check this address right now. You can still continue."],
} satisfies Record<SlugStatus, [string, string]>)[status];

export function RestaurantForm({ host }: { host: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRestaurant, {});
  const [name, setName] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const slug = customSlug ?? suggestSlug(name);
  const status = useSlugAvailability(slug);
  const [tone, message] = statusText(status, host, slug);
  return <form action={action} className="mt-7 space-y-5">
    <Field label="Restaurant name">
      <input className={inputClass} name="name" value={name} onChange={event => setName(event.target.value)} placeholder="Momo House" autoComplete="organization" maxLength={100} required />
    </Field>
    <Field label="Your menu address">
      <div className="mt-2 flex items-center rounded-xl border border-line-strong bg-surface font-normal transition-colors hover:border-ink-subtle focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
        <span className="max-w-[45%] shrink-0 truncate border-r border-line py-3 pl-4 pr-2 text-sm text-ink-subtle">{host}/</span>
        <input className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-ink outline-none focus-visible:outline-none" name="slug" value={slug} onChange={event => setCustomSlug(event.target.value.toLowerCase())}
          placeholder="momo-house-thamel" autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" required
          aria-describedby="slug-help" aria-invalid={status === "taken" || undefined} />
      </div>
      <span id="slug-help" role="status" aria-live="polite" className={`mt-2 block text-xs font-normal leading-5 ${tone}`}>{message}</span>
    </Field>
    <FormError message={state.error} />
    <button disabled={pending || status === "taken"} className={`${primaryClass} w-full`}>{pending ? "Creating…" : "Create restaurant"}</button>
  </form>;
}
