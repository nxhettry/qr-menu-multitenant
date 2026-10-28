"use client";
import { useState } from "react";
import type { DisplayField } from "@/lib/menu/details";
import { DisplayOptions } from "./display-options";
import { cardClass, eyebrowClass, primaryClass } from "@/components/ui/form";

export function MenuDisplayForm({ initialHiddenFields, pending, disabled, onSave }: {
  initialHiddenFields: DisplayField[]; pending: boolean; disabled: boolean; onSave: (hidden_fields: DisplayField[]) => void;
}) {
  const [hidden, setHidden] = useState(initialHiddenFields);
  return <form onSubmit={event => { event.preventDefault(); onSave(hidden); }} className={`${cardClass} space-y-5 p-5 sm:p-7`}>
    <div><p className={eyebrowClass}>Your menu, your way</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">What guests see</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Check the details you want on the public menu. Unchecked details stay saved for you. You can also hide details on individual items.</p></div>
    <DisplayOptions hiddenFields={hidden} onChange={setHidden} disabled={disabled || pending} />
    <p className="text-xs leading-5 text-ink-muted">Names, prices, portions and sold-out information stay visible. Hide an entire item using its “Show on menu” checkbox.</p>
    <button className={primaryClass} disabled={disabled || pending}>{pending ? "Saving…" : "Save display options"}</button>
  </form>;
}
