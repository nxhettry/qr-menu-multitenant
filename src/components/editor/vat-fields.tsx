"use client";
import { memo, useState } from "react";
import { useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import type { SettingsInput } from "@/lib/editor/schemas";
import { Field, Hint, inputClass } from "@/components/ui/form";

export const DEFAULT_VAT_PERCENT = 13;

const modes = [
  { includeVat: true, label: "Including VAT", hint: "Guests pay exactly what you enter." },
  { includeVat: false, label: "Excluding VAT", hint: "VAT is added on top for guests." },
] as const;

export const VatFields = memo(function VatFields({ control, register, setValue, savedVatPercent, savedIncludeVat, onChangeMode }: {
  control: Control<SettingsInput>; register: UseFormRegister<SettingsInput>; setValue: UseFormSetValue<SettingsInput>;
  savedVatPercent: number; savedIncludeVat: boolean; onChangeMode: (toInclusive: boolean) => void;
}) {
  const [vatOn, setVatOn] = useState(savedVatPercent > 0);
  const vatPercent = useWatch({ control, name: "vat_percent" });
  const rateUnsaved = vatPercent !== savedVatPercent;
  return <fieldset className="space-y-4">
    <legend className="text-sm font-medium text-ink">VAT</legend>
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input type="checkbox" className="h-5 w-5" checked={vatOn} onChange={event => {
        setVatOn(event.target.checked);
        setValue("vat_percent", event.target.checked ? (savedVatPercent > 0 ? savedVatPercent : DEFAULT_VAT_PERCENT) : 0, { shouldDirty: true });
      }} />
      My prices are subject to VAT
    </label>
    {vatOn && <>
      <Field label="VAT rate (%)"><input {...register("vat_percent", { valueAsNumber: true })} type="number" inputMode="decimal" min={0} max={100} step="0.01" className={inputClass} required /></Field>
      <div role="radiogroup" aria-label="Prices I enter are" className="space-y-2">
        <p className="text-sm font-medium text-ink">Prices I enter are</p>
        {modes.map(mode => <label key={mode.label} className={`flex min-h-11 items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors ${savedIncludeVat === mode.includeVat ? "border-brand bg-brand-soft" : "border-line"} ${rateUnsaved ? "opacity-60" : "cursor-pointer hover:border-ink-subtle"}`}>
          <input type="radio" name="vat-mode" className="mt-0.5 h-5 w-5 shrink-0" checked={savedIncludeVat === mode.includeVat} disabled={rateUnsaved}
            onChange={() => { if (savedIncludeVat !== mode.includeVat) onChangeMode(mode.includeVat); }} />
          <span><span className="block font-semibold">{mode.label}</span><span className="block text-xs leading-5 text-ink-muted">{mode.hint}</span></span>
        </label>)}
        <Hint>{rateUnsaved ? "Save your VAT rate before changing this." : "Guests always see the final price, with VAT included."}</Hint>
      </div>
    </>}
  </fieldset>;
});
