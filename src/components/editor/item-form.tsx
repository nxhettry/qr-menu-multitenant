"use client";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { EditorCategory, EditorItem } from "@/lib/editor/data";
import { itemInput, parsePrice, priceInputValue, type ItemInput } from "@/lib/editor/schemas";
import { Field, FormError, eyebrowClass, inputClass, noticeClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import type { ItemFields } from "./item-form-values";
import { ItemDetailFields } from "./item-detail-fields";
import { GuestPriceHint } from "./guest-price-hint";
import type { VatRule } from "@/lib/menu/vat";
import { categoryLabel, orderedCategories } from "@/lib/editor/categories";

export function ItemForm({ item, categoryId, categories, vat, pending, error, onSave, onCancel }: {
  item?: EditorItem; categoryId: string; categories: EditorCategory[]; vat: VatRule; pending: boolean; error?: string;
  onSave: (value: ItemInput) => void; onCancel: () => void;
}) {
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<ItemFields>({ defaultValues: {
    category_id: item?.category_id ?? categoryId, name: item?.name ?? "", name_ne: item?.name_ne ?? "",
    description: item?.description ?? "", description_ne: item?.description_ne ?? "", price: priceInputValue(item?.price_minor ?? null),
    uses_variants: item?.uses_variants ?? false, is_available: item?.is_available ?? true, is_featured: item?.is_featured ?? false, diet: item?.diet ?? "", spice_level: item?.spice_level?.toString() ?? "",
    confirm_prices: false, variants: item?.variants.map(variant => ({ name: variant.name, name_ne: variant.name_ne ?? "", price: priceInputValue(variant.price_minor), is_available: variant.is_available })) ?? [],
    is_visible: item?.is_visible ?? true, is_popular: item?.details.is_popular ?? false, is_new: item?.details.is_new ?? false,
    tags: item?.details.tags.join(", ") ?? "", allergens: item?.details.allergens.join(", ") ?? "", allergen_notes: item?.details.allergen_notes ?? "",
    preparation_minutes: item?.details.preparation_minutes?.toString() ?? "", calories: item?.details.calories?.toString() ?? "",
    hidden_fields: item?.details.hidden_fields ?? [], addon_groups: item?.details.addon_groups.map(group => ({ ...group, options: group.options.map(option => ({ ...option, price: priceInputValue(option.price_minor) })) })) ?? [],
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
        details: { is_popular: values.is_popular, is_new: values.is_new,
          tags: [...new Set(values.tags.split(",").map(tag => tag.trim()).filter(Boolean))], allergens: [...new Set(values.allergens.split(",").map(tag => tag.trim()).filter(Boolean))],
          allergen_notes: values.allergen_notes || null, preparation_minutes: values.preparation_minutes === "" ? null : Number(values.preparation_minutes),
          calories: values.calories === "" ? null : Number(values.calories), hidden_fields: values.hidden_fields,
          addon_groups: values.addon_groups.map(group => ({ ...group, options: group.options.map(option => ({ name: option.name, is_available: option.is_available, price_minor: parsePrice(option.price) })) })),
        },
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      onSave(parsed.data);
    } catch (error) { setError("root", { message: error instanceof Error ? error.message : "Check your menu item." }); }
  }
  return <form onSubmit={handleSubmit(submit)}>
    <fieldset disabled={pending} className="space-y-5">
      <p className={eyebrowClass}>Basic details</p>
      <Field label="Category / subcategory"><select {...register("category_id")} className={inputClass}>{orderedCategories(categories).map(category => <option key={category.id} value={category.id}>{categoryLabel(category, categories)}</option>)}</select></Field>
      <Field label="Item name"><input {...register("name")} className={inputClass} maxLength={150} required data-autofocus /></Field>
      <Field label="Nepali name (optional)"><input {...register("name_ne")} lang="ne" className={inputClass} maxLength={150} /></Field>
      <Field label="Description (optional)"><textarea {...register("description")} className={inputClass} rows={3} maxLength={1000} /></Field>
      <details className="text-sm"><summary className="cursor-pointer py-2">Nepali description</summary><textarea {...register("description_ne")} lang="ne" aria-label="Nepali description" className={inputClass} rows={3} maxLength={1000} /></details>
      <p className={`border-t border-line pt-5 ${eyebrowClass}`}>Pricing & portions</p>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input {...register("uses_variants")} type="checkbox" className="h-5 w-5" />Use variants, such as Half / Full or Small / Large</label>
      {!usesVariants ? <div><Field label="Price (Rs)"><input {...register("price")} className={inputClass} inputMode="decimal" placeholder="180.00" required /></Field><GuestPriceHint control={control} name="price" vat={vat} /></div> : <div className="space-y-4">
        {fields.map((field, index) => <div key={field.id} className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Variant name"><input {...register(`variants.${index}.name`)} className={inputClass} maxLength={100} placeholder="Half plate" required /></Field>
            <div><Field label="Price (Rs)"><input {...register(`variants.${index}.price`)} className={inputClass} inputMode="decimal" placeholder="180.00" required /></Field><GuestPriceHint control={control} name={`variants.${index}.price`} vat={vat} /></div>
          </div>
          <Field label="Nepali variant name (optional)"><input {...register(`variants.${index}.name_ne`)} lang="ne" className={inputClass} maxLength={100} /></Field>
          <label className="flex items-center gap-3 text-sm"><input {...register(`variants.${index}.is_available`)} type="checkbox" className="h-5 w-5" />Available today</label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} className={secondaryClass} aria-label={`Move variant ${index + 1} up`}>↑</button><button type="button" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} className={secondaryClass} aria-label={`Move variant ${index + 1} down`}>↓</button><button type="button" onClick={() => remove(index)} className={secondaryClass}>Remove variant</button></div>
        </div>)}
        <button type="button" disabled={fields.length >= 30} onClick={() => append({ name: "", name_ne: "", price: "", is_available: true })} className={secondaryClass}>+ Add variant</button>
        {!fields.length && <p className="text-sm text-ink-muted">Add at least one variant and price.</p>}
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Diet"><select {...register("diet")} className={inputClass}><option value="">Not specified</option><option value="VEG">Vegetarian</option><option value="NON_VEG">Non-vegetarian</option><option value="EGG">Contains egg</option></select></Field>
        <Field label="Spice level"><select {...register("spice_level")} className={inputClass}><option value="">Not specified</option><option value="0">No spice</option><option value="1">Mild</option><option value="2">Medium</option><option value="3">Hot</option></select></Field>
      </div>
      <label className="flex items-center gap-3 text-sm"><input {...register("is_available")} type="checkbox" className="h-5 w-5" />Available today</label>
      <p className={`border-t border-line pt-5 ${eyebrowClass}`}>Labels & visibility</p>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input {...register("is_visible")} type="checkbox" className="h-5 w-5" />Show this item on the public menu</label>
      <div className="flex flex-wrap gap-x-6 gap-y-2"><label className="flex min-h-11 items-center gap-3 text-sm"><input {...register("is_popular")} type="checkbox" className="h-5 w-5" />Popular item</label><label className="flex min-h-11 items-center gap-3 text-sm"><input {...register("is_new")} type="checkbox" className="h-5 w-5" />New item</label></div>
      <label className="flex items-start gap-3 rounded-xl bg-brand-soft p-4 text-sm"><input {...register("is_featured")} type="checkbox" className="mt-0.5 h-5 w-5" /><span>Feature in specials banner<span className="mt-1 block text-xs leading-5 text-ink-muted">Choose up to six specials. Their names, prices, and item photos appear at the top of your public menu. Hidden categories and sold-out specials stay out of the banner.</span></span></label>
      <ItemDetailFields control={control} register={register} vat={vat} />
      {item?.is_example_price && <label className={`${noticeClass("warning")} flex items-start gap-3`}><input {...register("confirm_prices")} type="checkbox" className="mt-1 h-5 w-5" required />I have checked every example price for this item and its variants.</label>}
      <FormError message={errors.root?.message ?? error} />
      <DialogFooter><button disabled={pending} className={primaryClass}>{pending ? "Saving…" : "Save item"}</button><button type="button" onClick={onCancel} className={secondaryClass}>Cancel</button></DialogFooter>
    </fieldset>
  </form>;
}
