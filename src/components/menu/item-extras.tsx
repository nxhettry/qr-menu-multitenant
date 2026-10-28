import type { ReactNode } from "react";
import type { ItemDetails } from "@/lib/menu/details";
import { formatPrice } from "@/lib/menu/presentation";
import { MenuIcon } from "./icon";

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group mt-2 border-t border-line text-xs text-ink-muted">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-ink [&::-webkit-details-marker]:hidden">{title}<MenuIcon name="chevron" className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" /></summary>
    <div className="pb-2">{children}</div>
  </details>;
}

export function ItemExtras({ details }: { details?: ItemDetails }) {
  if (!details) return null;
  const { preparation_minutes, calories, allergens, allergen_notes, addon_groups } = details;
  return <>
    {(preparation_minutes !== null || calories !== null) && <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-5 text-ink-subtle">{preparation_minutes !== null && <span className="inline-flex items-center gap-1"><MenuIcon name="clock" className="h-3.5 w-3.5" />{preparation_minutes} min</span>}{calories !== null && <span>{calories} kcal</span>}</p>}
    {!!details.tags.length && <ul aria-label="Item tags" className="mt-2.5 flex flex-wrap gap-1.5">{details.tags.map(tag => <li key={tag} className="max-w-full break-words rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-ink-muted">{tag}</li>)}</ul>}
    {(!!allergens.length || allergen_notes) && <Disclosure title="Allergen information">{!!allergens.length && <p className="break-words leading-5">Contains: {allergens.join(", ")}.</p>}{allergen_notes && <p className="mt-1 break-words leading-5">{allergen_notes}</p>}<p className="mt-2 leading-5">Please tell our staff about any allergies.</p></Disclosure>}
    {!!addon_groups.length && <Disclosure title="Add-ons & extras"><div className="space-y-4">{addon_groups.map((group, index) => <section key={index}><h4 className="break-words font-semibold text-ink">{group.name}</h4><p className="mt-0.5 leading-5 text-ink-subtle">{group.min_select ? `Choose ${group.min_select}–${group.max_select}` : `Optional · up to ${group.max_select}`}</p><dl className="mt-2 space-y-1.5">{group.options.map((option, i) => <div key={i} className="flex flex-wrap justify-between gap-1"><dt className="break-words">{option.name}{!option.is_available && " · Sold out"}</dt><dd className="shrink-0 font-medium tabular-nums text-ink">+{formatPrice(option.price_minor)}</dd></div>)}</dl></section>)}</div><p className="mt-3 leading-5 text-ink-subtle">Ask your server to add extras.</p></Disclosure>}
  </>;
}
