"use client";
import { useActionState } from "react";
import { changeOwnPasswordAction } from "@/app/admin/actions";
import type { AdminActionState } from "@/lib/admin/schemas";
import { Field, inputClass, primaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";

export function OwnPasswordForm() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(changeOwnPasswordAction, {});
  return <form action={action} className="space-y-5">
    <Field label="Current password"><input className={inputClass} name="current" type="password" autoComplete="current-password" maxLength={128} required /></Field>
    <Field label="New password"><input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></Field>
    <Field label="Confirm new password"><input className={inputClass} name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></Field>
    <ActionResult result={state} />
    <button disabled={pending} className={primaryClass}>{pending ? "Saving…" : "Update password"}</button>
  </form>;
}
