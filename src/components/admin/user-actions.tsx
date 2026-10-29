"use client";
import { useActionState } from "react";
import { sendUserResetAction, setUserBannedAction, setUserPasswordAction } from "@/app/admin/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { AdminActionState } from "@/lib/admin/schemas";
import { dangerClass, Field, inputClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";

export function UserActions({ userId, banned }: { userId: string; banned: boolean }) {
  const access = useAdminAction();
  const [passwordState, setPassword, settingPassword] = useActionState<AdminActionState, FormData>(setUserPasswordAction.bind(null, userId), {});
  const toggleBan = () => {
    if (!banned && !window.confirm("Disable sign-in for this account? Their public menus stay online.")) return;
    access.run(() => setUserBannedAction(userId, !banned));
  };
  return <div className="space-y-6">
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={toggleBan} disabled={access.pending} className={banned ? primaryClass : dangerClass}>{banned ? "Enable sign-in" : "Disable sign-in"}</button>
        <button type="button" onClick={() => access.run(() => sendUserResetAction(userId))} disabled={access.pending} className={secondaryClass}>Send reset email</button>
      </div>
      <ActionResult result={access.result} />
    </div>
    <form action={setPassword} className="space-y-3 border-t border-line pt-5">
      <Field label="Set a new password"><input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></Field>
      <ActionResult result={passwordState} />
      <button disabled={settingPassword} className={secondaryClass}>{settingPassword ? "Saving…" : "Set password"}</button>
    </form>
  </div>;
}
