"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { EditorRestaurant } from "@/lib/editor/data";
import { settingsInput, type SettingsInput } from "@/lib/editor/schemas";
import { Field, FormError, inputClass, primaryClass } from "./form-fields";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function SettingsForm({ restaurant, pending, disabled, onSave }: {
  restaurant: EditorRestaurant; pending: boolean; disabled: boolean; onSave: (input: SettingsInput) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<SettingsInput>({
    resolver: zodResolver(settingsInput), defaultValues: {
      name: restaurant.name, slug: restaurant.slug, name_ne: restaurant.name_ne ?? "", description: restaurant.description ?? "",
      phone: restaurant.phone ?? "", address: restaurant.address ?? "", map_url: restaurant.map_url ?? "", theme_color: restaurant.theme_color,
      prices_include_vat: restaurant.prices_include_vat, vat_percent: restaurant.vat_percent, service_charge_percent: restaurant.service_charge_percent,
      opening_hours: Object.fromEntries(days.map(day => [day, typeof restaurant.opening_hours[day] === "string" ? restaurant.opening_hours[day] : ""])),
    },
  });
  const errorMessage = Object.values(errors)[0]?.message;
  return <form onSubmit={handleSubmit(onSave)} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
    <h2 className="font-serif text-2xl">Restaurant settings</h2>
    <fieldset disabled={disabled || pending} className="space-y-5">
      <Field label="Restaurant name"><input {...register("name")} className={inputClass} maxLength={100} required /></Field>
      <Field label="Nepali name (optional)"><input {...register("name_ne")} lang="ne" className={inputClass} maxLength={100} /></Field>
      <Field label="Menu address"><input {...register("slug")} className={inputClass} autoCapitalize="none" spellCheck={false} minLength={3} maxLength={40} required /><span className="mt-2 block text-xs font-normal leading-5 text-stone-600">Printed QR codes keep working after a rename. Previous addresses stay reserved for you.</span></Field>
      <Field label="Description"><textarea {...register("description")} className={inputClass} rows={3} maxLength={1000} /></Field>
      <Field label="Phone"><input {...register("phone")} type="tel" className={inputClass} maxLength={30} /></Field>
      <Field label="Address"><input {...register("address")} className={inputClass} maxLength={300} /></Field>
      <Field label="Map link (HTTPS)"><input {...register("map_url")} type="url" placeholder="https://maps.google.com/…" className={inputClass} maxLength={1000} /></Field>
      <Field label="Theme color"><input {...register("theme_color")} type="color" className="mt-2 block h-12 w-24 rounded-lg border border-stone-300 bg-white p-1" /><span className="mt-2 block text-xs font-normal text-stone-600">Menu text is adjusted automatically for readable contrast.</span></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="VAT (%)"><input {...register("vat_percent", { valueAsNumber: true })} type="number" min={0} max={100} step="0.01" className={inputClass} required /></Field>
        <Field label="Service charge (%)"><input {...register("service_charge_percent", { valueAsNumber: true })} type="number" min={0} max={100} step="0.01" className={inputClass} required /></Field>
      </div>
      <label className="flex items-center gap-3 text-sm"><input {...register("prices_include_vat")} type="checkbox" className="h-5 w-5" />Displayed prices include VAT</label>
      <details><summary className="cursor-pointer py-3 text-sm font-medium">Opening hours</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">{days.map(day => <Field key={day} label={day}><input {...register(`opening_hours.${day}`)} className={inputClass} maxLength={100} placeholder="09:00–21:00, or Closed" /></Field>)}</div></details>
      <FormError message={typeof errorMessage === "string" ? errorMessage : undefined} />
      <button disabled={disabled || pending} className={primaryClass}>{pending ? "Saving…" : "Save settings"}</button>
    </fieldset>
  </form>;
}
