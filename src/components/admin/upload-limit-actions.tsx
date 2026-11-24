"use client";
import { useCallback, useState, type ReactNode } from "react";
import { setDefaultUploadLimitAction, setUserUploadLimitAction } from "@/app/admin/actions";
import { UPLOAD_LIMIT_MAX, type AdminActionState, type UserUploadLimit } from "@/lib/admin/schemas";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Field, inputClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";

type LimitFormProps = { initial: number; summary: ReactNode; save: (limit: number) => Promise<AdminActionState>; reset?: () => Promise<AdminActionState> };

function LimitForm({ initial, summary, save, reset }: LimitFormProps) {
  const { pending, result, run } = useAdminAction();
  const [value, setValue] = useState(String(initial));
  const submit = useCallback(() => run(() => save(Number(value))), [run, save, value]);
  const restore = useCallback(() => reset && run(reset), [run, reset]);
  return <div className="space-y-3">
    <p className="text-sm leading-6 text-ink-muted">{summary}</p>
    <Field label="Uploads per week"><input type="number" inputMode="numeric" min={1} max={UPLOAD_LIMIT_MAX} value={value} onChange={event => setValue(event.target.value)} className={inputClass} /></Field>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={submit} className={primaryClass}>{pending ? "Saving…" : "Save limit"}</button>
      {reset && <button type="button" disabled={pending} onClick={restore} className={secondaryClass}>Use default</button>}
    </div>
    <ActionResult result={result} />
  </div>;
}

export function DefaultUploadLimitAction({ weeklyLimit }: { weeklyLimit: number }) {
  return <LimitForm initial={weeklyLimit} save={setDefaultUploadLimitAction}
    summary={<>Each account can upload {weeklyLimit} photos in any 7 days, across all its restaurants. Picking a library photo never counts.</>} />;
}

export function UserUploadLimitAction({ userId, current }: { userId: string; current: UserUploadLimit }) {
  const save = useCallback((limit: number) => setUserUploadLimitAction(userId, limit), [userId]);
  const reset = useCallback(() => setUserUploadLimitAction(userId, null), [userId]);
  return <LimitForm initial={current.limit} save={save} reset={current.overridden ? reset : undefined}
    summary={<>{current.usedThisWeek} of {current.limit} photo uploads used in the last 7 days{current.overridden ? ` (custom limit; default is ${current.defaultLimit})` : ""}.</>} />;
}
