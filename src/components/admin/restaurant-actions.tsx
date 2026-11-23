"use client";
import { useState } from "react";
import { setRestaurantSuspendedAction, setUploadLimitAction } from "@/app/admin/actions";
import type { UploadLimit } from "@/lib/admin/schemas";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Field, dangerClass, inputClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";

export function RestaurantStatusAction({ restaurantId, suspended }: { restaurantId: string; suspended: boolean }) {
  const { pending, result, run } = useAdminAction();
  const toggle = () => {
    if (!suspended && !window.confirm("Suspend this restaurant? Its public menu goes offline and the owner can’t edit it.")) return;
    run(() => setRestaurantSuspendedAction(restaurantId, !suspended));
  };
  return <div className="space-y-3">
    <button type="button" onClick={toggle} disabled={pending} className={suspended ? primaryClass : dangerClass}>{pending ? "Saving…" : suspended ? "Restore restaurant" : "Suspend restaurant"}</button>
    <ActionResult result={result} />
  </div>;
}

export function UploadLimitAction({ restaurantId, current }: { restaurantId: string; current: UploadLimit }) {
  const { pending, result, run } = useAdminAction();
  const [value, setValue] = useState(String(current.limit));
  return <div className="space-y-3">
    <p className="text-sm leading-6 text-ink-muted">{current.usedToday} of {current.limit} photo uploads used in the last 24 hours{current.overridden ? " (custom limit)" : ""}. New restaurants get 50 a day for their first week, then 15.</p>
    <Field label="Uploads per day"><input type="number" inputMode="numeric" min={1} max={500} value={value} onChange={event => setValue(event.target.value)} className={inputClass} /></Field>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={() => run(() => setUploadLimitAction(restaurantId, Number(value)))} className={primaryClass}>{pending ? "Saving…" : "Save limit"}</button>
      {current.overridden && <button type="button" disabled={pending} onClick={() => run(() => setUploadLimitAction(restaurantId, null))} className={secondaryClass}>Use default</button>}
    </div>
    <ActionResult result={result} />
  </div>;
}
