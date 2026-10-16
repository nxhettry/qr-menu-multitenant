"use client";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { EditorCategory, EditorItem } from "@/lib/editor/data";
import { itemInput, parsePrice, priceInputValue, type ItemInput } from "@/lib/editor/schemas";
import { Field, FormError, inputClass, primaryClass, secondaryClass } from "./form-fields";

type ItemFields = {
  category_id: string; name: string; name_ne: string; description: string; description_ne: string;
  price: string; uses_variants: boolean; is_available: boolean; is_featured: boolean; diet: string; spice_level: string; confirm_prices: boolean;
  variants: { name: string; name_ne: string; price: string; is_available: boolean }[];
};

export function ItemForm({ item, categoryId, categories, pending, onSave, onCancel }: {
  item?: EditorItem; categoryId: string; categories: EditorCategory[]; pending: boolean;
  onSave: (value: ItemInput) => void; onCancel: () => void;
}) {
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<ItemFields>({ defaultValues: {
    category_id: item?.category_id ?? categoryId, name: item?.name ?? "", name_ne: item?.name_ne ?? "",
    description: item?.description ?? "", description_ne: item?.description_ne ?? "", price: priceInputValue(item?.price_minor ?? null),
    uses_variants: item?.uses_variants ?? false, is_available: item?.is_available ?? true, is_featured: item?.is_featured ?? false, diet: item?.diet ?? "", spice_level: item?.spice_level?.toString() ?? "",
    confirm_prices: false, variants: item?.variants.map(variant => ({ name: variant.name, name_ne: variant.name_ne ?? "", price: priceInputValue(variant.price_minor), is_available: variant.is_available })) ?? [],
  } });
  const { fields, append, remove, move } = useFieldArray({ control, name: "variants" });
  const usesVariants = useWatch({ control, name: "uses_variants" });
  function submit(values: ItemFields) {
    try {
      if (item?.is_example_price && !values.confirm_prices) throw new Error("Confirm the example prices before saving.");
      const parsed = itemInput.safeParse({
        ...values, id: item?.id, price_minor: values.uses_variants ? null : parsePrice(values.price),
        diet: values.diet || null, spice_level: values.spice_level === "" ? null : Number(values.spice_level),
        variants: values.uses_variants ? values.variants.map(variant => ({ name: variant.name, name_ne: variant.name_ne, price_minor: parsePrice(variant.price), is_available: variant.is_available })) : [],
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      onSave(parsed.data);
    } catch (error) { setError("root", { message: error instanceof Error ? error.message : "Check your menu item." }); }
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-5 rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
    <h3 className="text-lg font-semibold">{item ? "Edit item" : "Add an item"}</h3>
    <fieldset disabled={pending} className="space-y-5">
      <Field label="Category"><select {...register("category_id")} className={inputClass}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      <Field label="Item name"><input {...register("name")} className={inputClass} maxLength={150} required autoFocus /></Field>
      <Field label="Nepali name (optional)"><input {...register("name_ne")} lang="ne" className={inputClass} maxLength={150} /></Field>
      <Field label="Description (optional)"><textarea {...register("description")} className={inputClass} rows={3} maxLength={1000} /></Field>
      <details className="text-sm"><summary className="cursor-pointer py-2">Nepali description</summary><textarea {...register("description_ne")} lang="ne" aria-label="Nepali description" className={inputClass} rows={3} maxLength={1000} /></details>
      <label className="flex items-center gap-3 text-sm"><input {...register("uses_variants")} type="checkbox" className="h-5 w-5" />Use variants, such as Veg / Chicken / Buff</label>
      {!usesVariants ? <Field label="Price (Rs)"><input {...register("price")} className={inputClass} inputMode="decimal" placeholder="180.00" required /></Field> : <div className="space-y-4">
        {fields.map((field, index) => <div key={field.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Variant name"><input {...register(`variants.${index}.name`)} className={inputClass} maxLength={100} placeholder="Buff · Steam" required /></Field>
            <Field label="Price (Rs)"><input {...register(`variants.${index}.price`)} className={inputClass} inputMode="decimal" placeholder="180.00" required /></Field>
          </div>
          <Field label="Nepali variant name (optional)"><input {...register(`variants.${index}.name_ne`)} lang="ne" className={inputClass} maxLength={100} /></Field>
          <label className="flex items-center gap-3 text-sm"><input {...register(`variants.${index}.is_available`)} type="checkbox" className="h-5 w-5" />Available today</label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} className={secondaryClass} aria-label={`Move variant ${index + 1} up`}>↑</button><button type="button" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} className={secondaryClass} aria-label={`Move variant ${index + 1} down`}>↓</button><button type="button" onClick={() => remove(index)} className={secondaryClass}>Remove variant</button></div>
        </div>)}
        <button type="button" disabled={fields.length >= 30} onClick={() => append({ name: "", name_ne: "", price: "", is_available: true })} className={secondaryClass}>+ Add variant</button>
        {!fields.length && <p className="text-sm text-stone-600">Add at least one variant and price.</p>}
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Diet"><select {...register("diet")} className={inputClass}><option value="">Not specified</option><option value="VEG">Vegetarian</option><option value="NON_VEG">Non-vegetarian</option><option value="EGG">Contains egg</option></select></Field>
        <Field label="Spice level"><select {...register("spice_level")} className={inputClass}><option value="">Not specified</option><option value="0">No spice</option><option value="1">Mild</option><option value="2">Medium</option><option value="3">Hot</option></select></Field>
      </div>
      <label className="flex items-center gap-3 text-sm"><input {...register("is_available")} type="checkbox" className="h-5 w-5" />Available today</label>
      <label className="flex items-start gap-3 rounded-xl bg-orange-100/60 p-4 text-sm"><input {...register("is_featured")} type="checkbox" className="mt-0.5 h-5 w-5" /><span>Feature in specials banner<span className="mt-1 block text-xs leading-5 text-stone-600">Choose up to six specials. Their names, prices, and item photos appear at the top of your public menu. Hidden categories and sold-out specials stay out of the banner.</span></span></label>
      {item?.is_example_price && <label className="flex items-start gap-3 rounded-xl bg-amber-100 p-4 text-sm"><input {...register("confirm_prices")} type="checkbox" className="mt-1 h-5 w-5" required />I have checked every example price for this item and its variants.</label>}
      <FormError message={errors.root?.message} />
      <div className="flex flex-wrap gap-3"><button disabled={pending} className={primaryClass}>{pending ? "Saving…" : "Save item"}</button><button type="button" onClick={onCancel} className={secondaryClass}>Cancel</button></div>
    </fieldset>
  </form>;
}
