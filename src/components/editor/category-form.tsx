"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categoryInput, type CategoryInput } from "@/lib/editor/schemas";
import type { EditorCategory } from "@/lib/editor/data";
import { Field, FormError, inputClass, primaryClass, secondaryClass } from "./form-fields";

export function CategoryForm({ category, categories, parentId, pending, onSave, onCancel }: {
  category?: EditorCategory; categories: EditorCategory[]; parentId?: string; pending: boolean; onSave: (value: CategoryInput) => void; onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CategoryInput>({
    resolver: zodResolver(categoryInput),
    defaultValues: { id: category?.id, parent_id: category?.parent_id ?? parentId ?? null, name: category?.name ?? "", name_ne: category?.name_ne ?? "", is_visible: category?.is_visible ?? true },
  });
  return <form onSubmit={handleSubmit(onSave)} className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
    <h3 className="text-lg font-semibold">{category ? "Edit category" : "Add a category"}</h3>
    <fieldset disabled={pending} className="space-y-4">
      <Field label="Parent category"><select {...register("parent_id", { setValueAs: value => value || null })} className={inputClass} disabled={!!category && categories.some(entry => entry.parent_id === category.id)}><option value="">None — top-level category</option>{categories.filter(entry => !entry.parent_id && entry.id !== category?.id).map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><span className="mt-2 block text-xs font-normal text-stone-600">Choose Momo as the parent for Chicken, Buff or Mutton.</span></Field>
      <Field label="Category name"><input {...register("name")} className={inputClass} maxLength={100} required autoFocus /></Field>
      <Field label="Nepali name (optional)"><input {...register("name_ne")} lang="ne" className={inputClass} maxLength={100} /></Field>
      <label className="flex items-center gap-3 text-sm"><input {...register("is_visible")} type="checkbox" className="h-5 w-5" />Show this category on the public menu</label>
      <FormError message={Object.values(errors)[0]?.message} />
      <div className="flex gap-3"><button className={primaryClass} disabled={pending}>{pending ? "Saving…" : "Save category"}</button><button type="button" onClick={onCancel} className={secondaryClass}>Cancel</button></div>
    </fieldset>
  </form>;
}
