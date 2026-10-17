"use client";
import type { EditorCategory } from "@/lib/editor/data";
import type { EditorMutation } from "@/lib/editor/schemas";
import { useMenuImport } from "@/hooks/use-menu-import";
import { formatPrice } from "@/lib/menu/presentation";
import { FormError, primaryClass, secondaryClass } from "./form-fields";

export function BulkImport({ categories, pending, disabled, onImport }: {
  categories: EditorCategory[]; pending: boolean; disabled: boolean; onImport: (input: EditorMutation, onSuccess: () => void) => void;
}) {
  const { preview, reading, error, read, requestId, confirmed, setConfirmed } = useMenuImport(categories);
  return <section aria-label="Bulk menu import" className="space-y-5 rounded-2xl border border-orange-200 bg-[#fffaf2] p-5 sm:p-7">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-orange-800">From your sheet to your menu</p><h2 className="mt-2 font-serif text-2xl">Add items in bulk</h2><p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">Download a template, fill in your dishes, then review them here. Existing items stay untouched.</p></div>
    <ol className="grid gap-3 text-sm sm:grid-cols-3">{["1 · Fill in the template", "2 · Upload & review", "3 · Confirm & import"].map(step => <li key={step} className="rounded-xl border border-orange-100 bg-white px-4 py-3 font-medium text-stone-700">{step}</li>)}</ol>
    <div className="flex flex-wrap gap-3"><a href="/templates/menu-import.xlsx" download className={secondaryClass}>Download Excel template ↓</a><a href="/templates/menu-import.csv" download className={secondaryClass}>CSV template ↓</a></div>
    <details className="text-sm text-stone-600"><summary className="cursor-pointer py-3 font-medium">How to fill your sheet</summary><div className="space-y-2 pb-3 leading-6"><p>Use Category → Subcategory → Item, for example Momo → Chicken → Steamed momo. Leave subcategory blank when it is not needed.</p><p>For Half / Full portions, repeat the item on two rows and change only variant, variant_ne, price and variant_available. Leave variant blank for a single-price item.</p><p>Prices are in rupees. Type is Veg, Non-veg, Egg or blank. Use TRUE/FALSE for checkboxes. Separate tags and allergens with |. Add-ons use Extra achar:30|Cheese:50. The workbook includes an Instructions sheet.</p><p>Import at most 200 items / 1,000 rows per file, up to 1 MB. Remove the illustrative example rows before adding your own menu.</p></div></details>
    <label className="block rounded-xl border border-dashed border-orange-300 bg-white p-5 text-sm font-medium">Choose your completed sheet<input type="file" accept=".xlsx,.csv" disabled={disabled || pending || reading} className="mt-3 block w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-3 file:font-medium file:text-orange-900" onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); }} /></label>
    {reading && <p role="status" className="text-sm text-stone-600">Reading your sheet…</p>}
    <FormError message={error} />
    {preview && <div className="space-y-4">
      <div role="status"><h3 className="text-lg font-semibold">Review your import</h3><p className="mt-1 text-sm text-stone-600">{preview.rowCount} rows → {preview.items.length} {preview.items.length === 1 ? "item" : "items"} · {preview.issues.length ? `${preview.issues.length} issues to fix` : "Ready for your review"}</p></div>
      {!!preview.issues.length && <div role="alert" className="max-h-64 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p className="font-semibold">Fix these rows in your sheet and upload it again. Nothing has been imported.</p><ul className="mt-3 space-y-2">{preview.issues.map((issue, i) => <li key={i}>Row {issue.row}: {issue.message}</li>)}</ul></div>}
      <ul className="max-h-96 divide-y divide-stone-200 overflow-y-auto rounded-xl border border-stone-200 bg-white px-4">{preview.items.map((entry, index) => <li key={index} className="py-4 text-sm"><p className="text-xs text-stone-600">{entry.category}{entry.subcategory ? ` / ${entry.subcategory}` : ""}</p><h4 className="mt-1 break-words font-semibold">{entry.item.name}</h4><p className="mt-1 text-stone-600">{entry.item.variants.length ? entry.item.variants.map(variant => `${variant.name} ${formatPrice(variant.price_minor)}`).join(" · ") : formatPrice(entry.item.price_minor!)} · {entry.item.is_visible ? "Visible" : "Hidden"} · {entry.item.is_available ? "Available" : "Sold out"}</p></li>)}</ul>
      <label className="flex items-start gap-3 rounded-xl bg-orange-100/60 p-4 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={confirmed} disabled={pending || disabled || !!preview.issues.length} onChange={event => setConfirmed(event.target.checked)} /><span>I have checked every item, variant, price and allergen claim. Add these items to my menu.</span></label>
      <button className={primaryClass} disabled={disabled || pending || !confirmed || !!preview.issues.length || !preview.items.length} onClick={() => onImport({ operation: "importItems", payload: { request_id: requestId, items: preview.items } }, () => setConfirmed(false))}>{pending ? "Importing…" : `Import ${preview.items.length} ${preview.items.length === 1 ? "item" : "items"}`}</button>
    </div>}
  </section>;
}
