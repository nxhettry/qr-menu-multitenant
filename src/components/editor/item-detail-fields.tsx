"use client";
import { Controller, useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import type { ItemFields } from "./item-form-values";
import { DisplayOptions } from "./display-options";
import { Field, inputClass, secondaryClass } from "@/components/ui/form";
import type { VatRule } from "@/lib/menu/vat";
import { GuestPriceHint } from "./guest-price-hint";

type Props = { control: Control<ItemFields>; register: UseFormRegister<ItemFields>; vat: VatRule };

function AddonGroupFields({ control, register, vat, index, onRemove }: Props & { index: number; onRemove: () => void }) {
  const { fields, append, remove } = useFieldArray({ control, name: `addon_groups.${index}.options` });
  return <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
    <Field label="Add-on group name"><input {...register(`addon_groups.${index}.name`)} className={inputClass} maxLength={60} placeholder="Extra sauces" required /></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Minimum choices"><input {...register(`addon_groups.${index}.min_select`, { valueAsNumber: true })} className={inputClass} type="number" min={0} max={20} required /></Field><Field label="Maximum choices"><input {...register(`addon_groups.${index}.max_select`, { valueAsNumber: true })} className={inputClass} type="number" min={1} max={20} required /></Field></div>
    {fields.map((option, i) => <div key={option.id} className="space-y-3 border-t border-line pt-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Add-on name"><input {...register(`addon_groups.${index}.options.${i}.name`)} className={inputClass} maxLength={60} required /></Field><div><Field label="Extra price (Rs)"><input {...register(`addon_groups.${index}.options.${i}.price`)} className={inputClass} inputMode="decimal" placeholder="30.00" required /></Field><GuestPriceHint control={control} name={`addon_groups.${index}.options.${i}.price`} vat={vat} /></div></div><div className="flex flex-wrap items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-3 text-sm"><input {...register(`addon_groups.${index}.options.${i}.is_available`)} type="checkbox" className="h-5 w-5" />Add-on available</label><button type="button" onClick={() => remove(i)} className={secondaryClass}>Remove add-on</button></div></div>)}
    <div className="flex flex-wrap gap-2"><button type="button" className={secondaryClass} disabled={fields.length >= 20} onClick={() => append({ name: "", price: "0.00", is_available: true })}>+ Add option</button><button type="button" className={secondaryClass} onClick={onRemove}>Remove group</button></div>
  </div>;
}

export function ItemDetailFields({ control, register, vat }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "addon_groups" });
  return <>
    <details className="rounded-xl border border-line bg-surface p-4"><summary className="cursor-pointer py-2 font-semibold">Optional details & allergens</summary><div className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Preparation time (minutes)"><input {...register("preparation_minutes")} type="number" min={1} max={1440} className={inputClass} /></Field><Field label="Calories (kcal)"><input {...register("calories")} type="number" min={0} max={100000} className={inputClass} /></Field></div>
      <Field label="Tags"><input {...register("tags")} className={inputClass} maxLength={609} placeholder="Chef’s choice, Local favourite" /><span className="mt-2 block text-xs font-normal text-ink-muted">Separate tags with commas. Up to 10.</span></Field>
      <Field label="Contains allergens"><input {...register("allergens")} className={inputClass} maxLength={1219} placeholder="Sesame, Wheat, Dairy" /><span className="mt-2 block text-xs font-normal text-ink-muted">Separate allergens with commas. Only add information you have verified.</span></Field>
      <Field label="Allergen notes"><textarea {...register("allergen_notes")} className={inputClass} rows={2} maxLength={500} placeholder="Prepared in a kitchen that also handles nuts." /></Field>
    </div></details>
    <details className="rounded-xl border border-line bg-surface p-4"><summary className="cursor-pointer py-2 font-semibold">Add-ons & extras ({fields.length} groups)</summary><div className="mt-4 space-y-4"><p className="text-sm leading-6 text-ink-muted">List optional extras or required choices with their prices. These are shown as menu information; guests order directly with your staff.</p>{fields.map((field, index) => <AddonGroupFields key={field.id} index={index} control={control} register={register} vat={vat} onRemove={() => remove(index)} />)}<button type="button" className={secondaryClass} disabled={fields.length >= 10} onClick={() => append({ name: "Extras", min_select: 0, max_select: 1, options: [{ name: "", price: "0.00", is_available: true }] })}>+ Add add-on group</button></div></details>
    <details className="rounded-xl border border-line bg-surface p-4"><summary className="cursor-pointer py-2 font-semibold">Choose which details guests see</summary><div className="mt-4 space-y-3"><p className="text-sm leading-6 text-ink-muted">Unchecked details are saved but hidden from guests. Menu-wide display settings also apply.</p><Controller control={control} name="hidden_fields" render={({ field }) => <DisplayOptions hiddenFields={field.value} onChange={field.onChange} />} /></div></details>
  </>;
}
