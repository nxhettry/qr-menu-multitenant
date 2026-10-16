import type { CSSProperties } from "react";
import Link from "next/link";
import type { PublishedMenu } from "@/lib/menu/schema";
import { accessibleAccent, openingHoursEntries, phoneHref, safeMapUrl } from "@/lib/menu/presentation";
import { MenuBrowser } from "./menu/menu-browser";
import { MenuPhoto } from "./menu/photo";

export function PublicMenu({ menu, isDemo = false }: { menu: PublishedMenu; isDemo?: boolean }) {
  const phone = phoneHref(menu.phone);
  const map = safeMapUrl(menu.mapUrl);
  const hours = openingHoursEntries(menu.openingHours);
  const updated = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" }).format(new Date(menu.updatedAt));
  const style = { "--menu-accent": accessibleAccent(menu.themeColor) } as CSSProperties;
  const initials = menu.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("");
  return <main style={style} className="mx-auto w-full max-w-[920px] px-4 pb-10 sm:px-7">
    {isDemo && <p className="pt-4 text-center text-[10px] font-semibold tracking-widest text-stone-600">EXAMPLE MENU · ILLUSTRATIVE PRICES</p>}
    <header className="flex items-center gap-4 py-6 sm:gap-5 sm:py-8">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dfcdb8] bg-[#f1e6d5] text-xl font-bold text-[#70492c] sm:h-20 sm:w-20">
        <span aria-hidden="true">{initials}</span>
        <MenuPhoto publicId={menu.logoPublicId} version={menu.logoVersion} alt={`${menu.name} logo`} kind="logo" className="absolute inset-0 h-full w-full rounded-full bg-[#faf8f2] object-contain" />
      </div>
      <div className="min-w-0">
        <h1 className="break-words font-serif text-[29px] font-bold leading-[1.08] tracking-tight sm:text-4xl">{menu.name}</h1>
        {menu.nameNe && <p lang="ne" className="mt-1 text-sm text-stone-600">{menu.nameNe}</p>}
        <p className="mt-2 text-xs tracking-wide text-stone-500 sm:text-sm">Scan <span className="px-1 text-[var(--menu-accent)]">·</span> Browse <span className="px-1 text-[var(--menu-accent)]">·</span> Dine</p>
      </div>
    </header>
    <MenuBrowser menu={menu} />
    <footer className="mt-8 border-t border-[#e7dfd3] pt-7 text-center text-xs leading-6 text-stone-600">
      {menu.description && <p className="mx-auto mb-4 max-w-md whitespace-pre-line text-sm leading-6">{menu.description}</p>}
      {menu.address && <p>{menu.address}</p>}
      {(phone || map) && <div className="my-4 flex flex-wrap justify-center gap-3 font-semibold text-[var(--menu-accent)]">
        {phone && <a href={phone} className="rounded-full border border-[#dfd2c1] px-5 py-2.5">Call restaurant</a>}
        {map && <a href={map} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#dfd2c1] px-5 py-2.5">Directions ↗</a>}
      </div>}
      {!!hours.length && <details className="mx-auto mb-5 max-w-sm"><summary className="cursor-pointer py-2 font-semibold">Opening hours</summary><dl className="mt-2 space-y-1 text-left">{hours.map(([day, value]) => <div key={day} className="flex justify-between gap-4"><dt>{day}</dt><dd>{value}</dd></div>)}</dl></details>}
      <p>All prices in Nepalese rupees (NPR).</p>
      {menu.vatPercent > 0 && <p>{menu.pricesIncludeVat ? "Prices include" : "Prices exclude"} {menu.vatPercent}% VAT.</p>}
      <p>{menu.serviceChargePercent > 0 ? `${menu.serviceChargePercent}% service charge applies.` : "No service charge."}</p>
      <p>Last updated: <time dateTime={menu.updatedAt}>{updated}</time></p>
      <Link href="/" className="mt-5 inline-block font-semibold text-[var(--menu-accent)]">Made with QR Menu ↗</Link>
    </footer>
  </main>;
}

export function UnavailableMenu() {
  return <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20 text-center">
    <p className="text-sm font-semibold text-orange-800">Please check back</p>
    <h1 className="mt-4 font-serif text-4xl">This menu isn’t available right now.</h1>
    <p className="mt-5 leading-7 text-stone-600">Please ask the restaurant for their menu or try again later.</p>
    <Link href="/" className="mt-8 text-sm underline">QR Menu home</Link>
  </main>;
}
