"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/auth/schemas";
import { DELETION_CONFIRMATION, DELETION_GRACE_DAYS } from "@/lib/account/constants";
import { requestAccountDeletionAction } from "@/app/dashboard/account/actions";
import { Field, FormError, dangerClass, inputClass } from "@/components/ui/form";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestAccountDeletionAction, {});
  return <form action={action} className="space-y-4">
    <p className="text-sm leading-6 text-ink-muted">Your restaurants are hidden and their menu addresses are released right away. After {DELETION_GRACE_DAYS} days your account, restaurants, menus and photos are permanently deleted. You can cancel until then.</p>
    <Field label={`Type ${DELETION_CONFIRMATION} to confirm`}>
      <input name="confirmation" className={inputClass} autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
    </Field>
    <FormError message={state.error} />
    <button disabled={pending} className={dangerClass}>{pending ? "Scheduling…" : "Delete my account"}</button>
  </form>;
}
