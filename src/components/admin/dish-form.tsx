"use client";
import { useForm } from "react-hook-form";
import { dishInput, type AdminDishRow, type DishInput } from "@/lib/dishes/schemas";
import { Field, FormError, Hint, inputClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";

type Fields = { name: string; name_ne: string; category: string; aliases: string; tags: string; status: "ACTIVE" | "HIDDEN" };
const lines = (value: string) => value.split("\n").map(line => line.trim()).filter(Boolean);

export function DishForm({ dish, pending, error, onSave, onCancel }: {
  dish?: AdminDishRow; pending: boolean; error?: string; onSave: (input: DishInput) => void; onCancel: () => void;
}) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Fields>({ defaultValues: {
    name: dish?.name ?? "", name_ne: dish?.nameNe ?? "", category: dish?.category ?? "", aliases: dish?.aliases.join("\n") ?? "",
    tags: dish?.tags.join(", ") ?? "", status: dish?.status ?? "ACTIVE",
  } });
  function submit(values: Fields) {
    const parsed = dishInput.safeParse({
      id: dish?.id, name: values.name, name_ne: values.name_ne || null, category: values.category || null,
      aliases: lines(values.aliases), tags: values.tags.split(",").map(tag => tag.trim()).filter(Boolean), status: values.status,
    });
    if (!parsed.success) setError("root", { message: parsed.error.issues[0].message });
    else onSave(parsed.data);
  }
  return <form onSubmit={handleSubmit(submit)}>
    <fieldset disabled={pending} className="space-y-5">
      <Field label="Dish name"><input {...register("name")} className={inputClass} maxLength={150} required data-autofocus /></Field>
      <Field label="Nepali name (optional)"><input {...register("name_ne")} lang="ne" className={inputClass} maxLength={150} /></Field>
      <Field label="Category (optional)"><input {...register("category")} className={inputClass} maxLength={100} placeholder="Momo" /></Field>
      <Field label="Other names">
        <textarea {...register("aliases")} className={inputClass} rows={4} placeholder={"One name per line"} />
        <Hint>Spellings owners type, such as “Mo:Mo” or “Kukhura momo”. Each one is suggested and matched exactly.</Hint>
      </Field>
      <Field label="Tags (comma separated)"><input {...register("tags")} className={inputClass} placeholder="veg, steamed" /></Field>
      <Field label="Status"><select {...register("status")} className={inputClass}><option value="ACTIVE">Active — suggested to owners</option><option value="HIDDEN">Hidden — no longer suggested</option></select></Field>
      <FormError message={errors.root?.message ?? error} />
      <DialogFooter><button className={primaryClass}>{pending ? "Saving…" : "Save dish"}</button><button type="button" onClick={onCancel} className={secondaryClass}>Cancel</button></DialogFooter>
    </fieldset>
  </form>;
}
