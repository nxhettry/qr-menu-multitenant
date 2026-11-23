"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/auth/schemas";
import { REPORT_REASONS } from "@/lib/abuse/schemas";
import { reportMenuAction } from "@/app/[slug]/report/actions";
import { useTurnstile } from "@/hooks/use-turnstile";
import { Field, FormError, inputClass, noticeClass, primaryClass } from "@/components/ui/form";
import { TurnstileField } from "@/components/ui/turnstile-field";

export function ReportMenuForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reportMenuAction.bind(null, slug), {});
  const captcha = useTurnstile(state);
  if (state.message) return <p role="status" className={noticeClass("success")}>{state.message}</p>;
  return <form action={action} className="space-y-5">
    <Field label="What’s wrong?">
      <select name="reason" className={inputClass} defaultValue="" required>
        <option value="" disabled>Choose a reason</option>
        {REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </Field>
    <Field label="Details (optional)"><textarea name="details" className={inputClass} rows={4} maxLength={1000} /></Field>
    <Field label="Your email or phone (optional)"><input name="contact" className={inputClass} maxLength={200} autoComplete="email" /></Field>
    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
    <TurnstileField captcha={captcha} />
    <FormError message={state.error} />
    <button disabled={pending || captcha.blocked} className={primaryClass}>{pending ? "Sending…" : "Send report"}</button>
  </form>;
}
