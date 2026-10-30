"use client";
import { memo, useId, useMemo, useState } from "react";
import type { EditorCategory } from "@/lib/editor/data";
import { planVatConversion, type VatConversionStrategy } from "@/lib/editor/vat-conversion";
import { formatPrice } from "@/lib/menu/presentation";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { FormError, primaryClass, secondaryClass } from "@/components/ui/form";

const PREVIEW_ROWS = 4;

const choices: { value: VatConversionStrategy; title: string; body: (toInclusive: boolean) => string }[] = [
  { value: "convert", title: "Keep what guests pay", body: toInclusive => `Your entered prices change so guests see the same amounts. ${toInclusive ? "VAT is added to every price you entered." : "VAT is taken out of every price you entered."}` },
  { value: "keep", title: "Keep my numbers", body: toInclusive => `Your entered prices stay as they are. Guests will see ${toInclusive ? "lower" : "higher"} prices.` },
];

export const VatModeDialog = memo(function VatModeDialog({ categories, vatPercent, toInclusive, pending, error, onConfirm, onCancel }: {
  categories: EditorCategory[]; vatPercent: number; toInclusive: boolean; pending: boolean; error?: string;
  onConfirm: (convertPrices: boolean) => void; onCancel: () => void;
}) {
  const [strategy, setStrategy] = useState<VatConversionStrategy>("convert");
  const groupId = useId();
  const plan = useMemo(() => planVatConversion(categories, vatPercent, toInclusive, strategy), [categories, vatPercent, toInclusive, strategy]);
  const blocked = strategy === "convert" && plan.overflow;
  return <Dialog title={toInclusive ? "Switch to prices including VAT" : "Switch to prices excluding VAT"} description={`${vatPercent}% VAT. Choose what happens to your existing prices.`} onClose={onCancel}>
    <fieldset className="space-y-3" disabled={pending}>
      <legend className="sr-only">What should happen to your prices?</legend>
      {choices.map(choice => <label key={choice.value} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${strategy === choice.value ? "border-brand bg-brand-soft" : "border-line hover:border-ink-subtle"}`}>
        <input type="radio" name={groupId} value={choice.value} checked={strategy === choice.value} onChange={() => setStrategy(choice.value)} className="mt-0.5 h-5 w-5 shrink-0" data-autofocus={choice.value === "convert" ? "" : undefined} />
        <span><span className="block font-semibold">{choice.title}</span><span className="mt-1 block leading-5 text-ink-muted">{choice.body(toInclusive)}</span></span>
      </label>)}
    </fieldset>
    <section aria-live="polite" className="mt-5">
      <h3 className="text-sm font-semibold">{strategy === "convert" ? "Your entered prices" : "What guests will see"}</h3>
      {plan.changed ? <>
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line text-sm">
          {plan.rows.slice(0, PREVIEW_ROWS).map((row, index) => <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5">
            <span className="min-w-0 break-words">{row.label}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">{formatPrice(row.from)} → <span className="font-semibold text-ink">{formatPrice(row.to)}</span></span>
          </li>)}
        </ul>
        <p className="mt-2 text-xs text-ink-muted">{plan.changed} {plan.changed === 1 ? "price" : "prices"} {strategy === "convert" ? "will change" : "will look different to guests"}{plan.changed > PREVIEW_ROWS ? `, ${plan.changed - PREVIEW_ROWS} not shown` : ""}. Prices are rounded to whole rupees.</p>
      </> : <p className="mt-2 text-sm text-ink-muted">No prices change.</p>}
    </section>
    {blocked && <p role="alert" className="mt-4 text-sm text-danger">A converted price would exceed the maximum. Choose “Keep my numbers” or lower that price first.</p>}
    <div className="mt-4"><FormError message={error} /></div>
    <DialogFooter>
      <button type="button" disabled={pending || blocked} onClick={() => onConfirm(strategy === "convert")} className={primaryClass}>{pending ? "Saving…" : "Apply change"}</button>
      <button type="button" disabled={pending} onClick={onCancel} className={secondaryClass}>Cancel</button>
    </DialogFooter>
  </Dialog>;
});
