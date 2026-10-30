"use client";
import { useState } from "react";
import type { MenuItem } from "@/lib/menu/schema";
import { formatPrice, guestPrice } from "@/lib/menu/presentation";
import type { VatRule } from "@/lib/menu/vat";
import { MenuPhoto } from "./photo";
import { MenuIcon } from "./icon";
import { fieldVisible } from "@/lib/menu/visibility";

const roundButton = "flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/25";

export function SpecialsBanner({ specials, coverPublicId, coverVersion, vat }: {
  specials: { item: MenuItem; categoryName: string }[]; coverPublicId: string | null; coverVersion: number | null; vat: VatRule;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const index = Math.max(0, specials.findIndex(({ item }) => item.id === activeId));
  const special = specials[index];
  const item = special?.item;
  const variantPrices = item?.variants.filter(variant => variant.isAvailable).map(variant => variant.priceMinor) ?? [];
  const price = item?.priceMinor ?? (variantPrices.length ? Math.min(...variantPrices) : null);
  const show = (offset: number) => setActiveId(specials[(index + offset + specials.length) % specials.length].item.id);
  return <section aria-label="Restaurant specials" className="relative isolate mt-5 overflow-hidden rounded-3xl bg-stone-900 text-white shadow-lift">
    {fieldVisible(item?.details, "photos") && <MenuPhoto publicId={item?.imagePublicId ?? coverPublicId} version={item?.imageVersion ?? coverVersion} alt="" kind="hero" className="absolute inset-0 h-full w-full object-cover" />}
    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50 to-black/10 sm:bg-linear-to-r sm:from-black/85 sm:via-black/55 sm:to-transparent" />
    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/40 blur-3xl" />
    <div className="relative z-10 flex min-h-[250px] flex-col items-start justify-end px-5 pb-5 pt-10 sm:min-h-[320px] sm:justify-center sm:px-9 sm:pb-8">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white ring-1 ring-white/20 backdrop-blur-md"><MenuIcon name="flame" className="h-3 w-3" />{item ? "Signature · " + special.categoryName : "Welcome to our table"}</p>
      <h2 className="mt-3 max-w-[85%] break-words text-[28px] font-semibold leading-[1.1] tracking-tight sm:max-w-[60%] sm:text-[42px]">{item?.name ?? "Good food. Great company."}</h2>
      {item?.description && <p className="mt-2 line-clamp-2 max-w-[85%] text-[13px] leading-5 text-white/80 sm:max-w-[50%] sm:text-sm">{item.description}</p>}
      <div className="mt-4 flex w-full flex-wrap items-center gap-x-5 gap-y-3">
        {price !== null && <p className="text-xl font-semibold tabular-nums sm:text-2xl">{item?.priceMinor === null ? <span className="mr-1 text-sm font-medium text-white/75">From</span> : null}{formatPrice(guestPrice(price, vat))}</p>}
        <a href={item ? `#dish-${item.id}` : "#menu-items"} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-stone-900 transition-transform hover:scale-[1.02]">{item ? "Explore this dish" : "Explore the menu"}<MenuIcon name="arrow" className="h-3.5 w-3.5" /></a>
      </div>
    </div>
    {specials.length > 1 && <div className="relative z-10 flex items-center justify-between gap-3 px-5 pb-5 sm:px-9 sm:pb-7">
      <div className="flex">{specials.map(({ item }, itemIndex) => <button key={item.id} aria-label={`Show special ${itemIndex + 1}: ${item.name}`} aria-pressed={itemIndex === index} onClick={() => setActiveId(item.id)} className="flex h-10 items-center px-1"><span className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-6 bg-white" : "w-1.5 bg-white/45"}`} /></button>)}</div>
      <div className="flex gap-2">
        <button onClick={() => show(-1)} aria-label="Previous special" className={roundButton}><MenuIcon name="back" className="h-4 w-4" /></button>
        <button onClick={() => show(1)} aria-label="Next special" className={roundButton}><MenuIcon name="arrow" className="h-4 w-4" /></button>
      </div>
    </div>}
  </section>;
}
