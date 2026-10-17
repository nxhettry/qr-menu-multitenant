"use client";
import { useState } from "react";
import type { MenuItem } from "@/lib/menu/schema";
import { formatPrice } from "@/lib/menu/presentation";
import { MenuPhoto } from "./photo";
import { MenuIcon } from "./icon";
import { fieldVisible } from "@/lib/menu/visibility";

export function SpecialsBanner({ specials, coverPublicId, coverVersion }: {
  specials: { item: MenuItem; categoryName: string }[]; coverPublicId: string | null; coverVersion: number | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const index = Math.max(0, specials.findIndex(({ item }) => item.id === activeId));
  const special = specials[index];
  const item = special?.item;
  const variantPrices = item?.variants.filter(variant => variant.isAvailable).map(variant => variant.priceMinor) ?? [];
  const price = item?.priceMinor ?? (variantPrices.length ? Math.min(...variantPrices) : null);
  return <section aria-label="Restaurant specials" className="relative isolate my-5 overflow-hidden rounded-[24px] bg-[#352418] text-white shadow-sm">
    {fieldVisible(item?.details, "photos") && <MenuPhoto publicId={item?.imagePublicId ?? coverPublicId} version={item?.imageVersion ?? coverVersion} alt="" kind="hero" className="absolute inset-0 h-full w-full object-cover" />}
    <div className="absolute inset-0 -z-0 bg-linear-to-r from-black/85 via-black/65 to-black/10" />
    <div className="relative z-10 flex min-h-[260px] flex-col items-start justify-center px-6 py-8 sm:min-h-[330px] sm:px-9">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300 sm:text-xs">{item ? "Our signature · " + special.categoryName : "Welcome to our table"}</p>
      <h2 className="mt-3 max-w-[75%] break-words font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:max-w-[60%] sm:text-5xl">{item?.name ?? "Good food. Great company."}</h2>
      {item?.description && <p className="mt-3 line-clamp-2 max-w-[70%] text-xs leading-5 text-white/85 sm:max-w-[50%] sm:text-sm">{item.description}</p>}
      {price !== null && <p className="mt-4 text-xl font-bold tabular-nums text-orange-300 sm:text-2xl">{item?.priceMinor === null ? "From " : ""}{formatPrice(price)}</p>}
      <a href={item ? `#dish-${item.id}` : "#menu-items"} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-white underline decoration-white/40 underline-offset-4">{item ? "Explore this dish" : "Explore the menu"}<MenuIcon name="arrow" className="h-3 w-3" /></a>
    </div>
    {specials.length > 1 && <div className="relative z-10 flex items-center justify-between px-6 pb-4">
      <button onClick={() => setActiveId(specials[(index - 1 + specials.length) % specials.length].item.id)} aria-label="Previous special" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white">←</button>
      <div className="flex gap-1">{specials.map(({ item }, itemIndex) => <button key={item.id} aria-label={`Show special ${itemIndex + 1}: ${item.name}`} aria-pressed={itemIndex === index} onClick={() => setActiveId(item.id)} className="flex h-9 w-6 items-center justify-center"><span className={`h-2 w-2 rounded-full ${itemIndex === index ? "bg-orange-400" : "bg-white/50"}`} /></button>)}</div>
      <button onClick={() => setActiveId(specials[(index + 1) % specials.length].item.id)} aria-label="Next special" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white">→</button>
    </div>}
  </section>;
}
