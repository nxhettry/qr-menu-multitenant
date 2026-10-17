import type { ItemDetails } from "@/lib/menu/details";
import { formatPrice } from "@/lib/menu/presentation";

export function ItemExtras({ details }: { details?: ItemDetails }) {
  if (!details) return null;
  const { preparation_minutes, calories, allergens, allergen_notes, addon_groups } = details;
  return <>
    {(preparation_minutes !== null || calories !== null) && <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-stone-600">{preparation_minutes !== null && <span>{preparation_minutes} min</span>}{calories !== null && <span>{calories} kcal</span>}</p>}
    {!!details.tags.length && <ul aria-label="Item tags" className="mt-3 flex flex-wrap gap-1.5">{details.tags.map(tag => <li key={tag} className="max-w-full break-words rounded-full bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-700">{tag}</li>)}</ul>}
    {(!!allergens.length || allergen_notes) && <details className="mt-3 border-t border-stone-200 pt-1 text-xs text-stone-700"><summary className="cursor-pointer py-3 font-semibold">Allergen information</summary>{!!allergens.length && <p className="break-words leading-5">Contains: {allergens.join(", ")}.</p>}{allergen_notes && <p className="mt-1 break-words leading-5">{allergen_notes}</p>}<p className="mt-2 leading-5">Please tell our staff about any allergies.</p></details>}
    {!!addon_groups.length && <details className="mt-2 border-t border-stone-200 pt-1 text-xs text-stone-700"><summary className="cursor-pointer py-3 font-semibold">Add-ons & extras</summary><div className="space-y-4">{addon_groups.map((group, index) => <section key={index}><h4 className="break-words font-semibold">{group.name}</h4><p className="mt-1 leading-5 text-stone-600">{group.min_select ? `Choose ${group.min_select}–${group.max_select}` : `Optional · up to ${group.max_select}`}</p><dl className="mt-2 space-y-2">{group.options.map((option, i) => <div key={i} className="flex flex-wrap justify-between gap-1"><dt className="break-words">{option.name}{!option.is_available && " · Sold out"}</dt><dd className="shrink-0 font-medium">+{formatPrice(option.price_minor)}</dd></div>)}</dl></section>)}</div><p className="mt-3 leading-5 text-stone-600">Ask your server to add extras.</p></details>}
  </>;
}
