"use client";
import { displayFields, type DisplayField } from "@/lib/menu/details";

export function DisplayOptions({ hiddenFields, onChange, disabled = false }: {
  hiddenFields: DisplayField[]; onChange: (fields: DisplayField[]) => void; disabled?: boolean;
}) {
  return <div className="grid gap-2 sm:grid-cols-2">{Object.entries(displayFields).map(([key, label]) => {
    const field = key as DisplayField;
    return <label key={field} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
      <input type="checkbox" disabled={disabled} className="h-5 w-5 shrink-0" checked={!hiddenFields.includes(field)} onChange={event => onChange(event.target.checked ? hiddenFields.filter(value => value !== field) : [...hiddenFields, field])} />{label}
    </label>;
  })}</div>;
}
