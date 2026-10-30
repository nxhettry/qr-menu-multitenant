import type { CSSProperties } from "react";
import Link from "next/link";
import type { PublishedMenu } from "@/lib/menu/schema";
import { accessibleAccent, accessibleAccentDark, openingHoursEntries, phoneHref, safeMapUrl } from "@/lib/menu/presentation";
import { MenuBrowser } from "./menu/menu-browser";
import { MenuPhoto } from "./menu/photo";
import { MenuIcon } from "./menu/icon";
import { PoweredBy } from "./ui/brand";
import { darkClass } from "./ui/form";
import { StatusScreen } from "./ui/status-screen";

const actionClass = "inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted";

export function PublicMenu({ menu, isDemo = false }: { menu: PublishedMenu; isDemo?: boolean }) {
  const phone = phoneHref(menu.phone);
  const map = safeMapUrl(menu.mapUrl);
  const hours = openingHoursEntries(menu.openingHours);
  const updated = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" }).format(new Date(menu.updatedAt));
  const style = { "--accent-light": accessibleAccent(menu.themeColor), "--accent-dark": accessibleAccentDark(menu.themeColor) } as CSSProperties;
  const initials = menu.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("");
  return <main style={style} className="menu-theme mx-auto w-full max-w-[960px] px-4 pb-8 sm:px-7">
    {isDemo && <p className="mx-auto mt-4 w-fit rounded-full border border-line bg-surface px-3 py-1 text-center text-[10px] font-semibold tracking-widest text-ink-muted">EXAMPLE MENU · ILLUSTRATIVE PRICES</p>}
    <header className="flex items-center gap-4 pb-5 pt-6 sm:gap-5 sm:pb-7 sm:pt-9">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent text-lg font-semibold text-on-accent shadow-card ring-1 ring-line sm:h-[72px] sm:w-[72px] sm:text-2xl">
        <span aria-hidden="true">{initials}</span>
        <MenuPhoto publicId={menu.logoPublicId} version={menu.logoVersion} alt={`${menu.name} logo`} kind="logo" className="absolute inset-0 h-full w-full bg-surface object-contain" />
      </div>
      <div className="min-w-0">
        <h1 className="break-words text-[22px] font-semibold leading-tight tracking-tight sm:text-3xl">{menu.name}</h1>
        {menu.nameNe && <p lang="ne" className="text-sm text-ink-muted">{menu.nameNe}</p>}
        {menu.address && <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-subtle sm:text-sm"><MenuIcon name="pin" className="h-3.5 w-3.5 shrink-0" />{menu.address}</p>}
      </div>
    </header>
    <MenuBrowser menu={menu} />
    <footer className="mt-10 rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-9">
      <p className="text-lg font-semibold tracking-tight">{menu.name}</p>
      {menu.description && <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-sm leading-6 text-ink-muted">{menu.description}</p>}
      {menu.address && <p className="mt-3 text-sm text-ink-muted">{menu.address}</p>}
      {(phone || map) && <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {phone && <a href={phone} className={darkClass}><MenuIcon name="phone" className="h-4 w-4" />Call restaurant</a>}
        {map && <a href={map} target="_blank" rel="noopener noreferrer" className={actionClass}><MenuIcon name="pin" className="h-4 w-4" />Directions ↗</a>}
      </div>}
      {!!hours.length && <details className="group mx-auto mt-5 max-w-sm rounded-2xl border border-line text-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden"><MenuIcon name="clock" className="h-4 w-4" />Opening hours<MenuIcon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
        <dl className="space-y-1.5 border-t border-line px-4 py-3 text-left text-ink-muted">{hours.map(([day, value]) => <div key={day} className="flex justify-between gap-4"><dt>{day}</dt><dd className="text-ink">{value}</dd></div>)}</dl>
      </details>}
      <div className="mx-auto mt-6 max-w-md space-y-0.5 border-t border-line pt-5 text-xs leading-6 text-ink-subtle">
        <p>All prices in Nepalese rupees (NPR).</p>
        {menu.vatPercent > 0 && <p>Prices include {menu.vatPercent}% VAT.</p>}
        <p>{menu.serviceChargePercent > 0 ? `${menu.serviceChargePercent}% service charge applies.` : "No service charge."}</p>
        <p>Last updated: <time dateTime={menu.updatedAt}>{updated}</time></p>
      </div>
    </footer>
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
      <Link href="/" className="font-medium transition-colors hover:text-ink">Free menu by QR Menu</Link><span aria-hidden="true">·</span><PoweredBy />
    </div>
  </main>;
}

export function UnavailableMenu() {
  return <StatusScreen eyebrow="Please check back" title="This menu isn’t available right now." body="Please ask the restaurant for their menu or try again later." />;
}
