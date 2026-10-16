import type { CSSProperties } from "react";
import { MenuImageDisplay } from "./menu-image-display";
import Link from "next/link";
import type { MenuItem, PublishedMenu } from "@/lib/menu/schema";
import { accessibleAccent, cloudinaryImageUrl, formatPrice, openingHoursEntries, phoneHref, safeMapUrl } from "@/lib/menu/presentation";

function MenuImage({ publicId, version, alt, kind }: {
  publicId: string | null; version: number | null; alt: string; kind: "cover" | "logo" | "item";
}) {
  const [width, height] = kind === "cover" ? [1280, 480] : kind === "logo" ? [192, 192] : [320, 240];
  const src = cloudinaryImageUrl(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, publicId, version, width, height);
  if (!src) return null;
  const widths = kind === "cover" ? [320, 640, 1280] : kind === "logo" ? [96, 192] : [320];
  const srcSet = widths.map(size => `${cloudinaryImageUrl(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, publicId, version, size, Math.round(size * height / width))} ${size}w`).join(", ");
  return <MenuImageDisplay key={src} src={src} srcSet={srcSet} sizes={kind === "cover" ? "(max-width: 640px) calc(100vw - 40px), 608px" : kind === "logo" ? "80px" : "128px"}
    alt={alt} width={width} height={height} className={kind === "cover" ? "mt-6 aspect-[8/3] w-full rounded-2xl object-cover" : kind === "logo" ? "mx-auto mb-5 h-20 w-20 rounded-2xl object-cover" : "mt-4 h-24 w-32 rounded-xl object-cover"} />;
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const available = item.isAvailable && (!item.variants.length || item.variants.some(variant => variant.isAvailable));
  const dietLabels = { VEG: "Vegetarian", NON_VEG: "Non-vegetarian", EGG: "Contains egg" };
  return <article className="border-b border-stone-200 py-6">
    <div className="flex items-baseline justify-between gap-5">
      <h3 className="min-w-0 break-words font-semibold">{item.name}
        {item.nameNe && <span lang="ne" className="mt-1 block text-sm font-normal text-stone-600">{item.nameNe}</span>}
      </h3>
      {item.priceMinor !== null && <span className="shrink-0 text-sm font-medium tabular-nums">{formatPrice(item.priceMinor)}</span>}
    </div>
    {item.description && <p className="mt-2 max-w-md whitespace-pre-line break-words text-sm leading-6 text-stone-600">{item.description}</p>}
    {item.descriptionNe && <p lang="ne" className="mt-2 text-sm leading-6 text-stone-600">{item.descriptionNe}</p>}
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      {!available && <span className="rounded-full bg-stone-200 px-3 py-1 font-medium">Sold out</span>}
      {item.diet && <span className="rounded-full border border-stone-300 px-3 py-1">{dietLabels[item.diet]}</span>}
      {item.spiceLevel !== null && item.spiceLevel > 0 && <span className="rounded-full border border-stone-300 px-3 py-1">{["", "Mild", "Medium", "Hot"][item.spiceLevel]}</span>}
    </div>
    <MenuImage publicId={item.imagePublicId} version={item.imageVersion} alt={item.name} kind="item" />
    {!!item.variants.length && <dl className="mt-4 grid gap-2 sm:grid-cols-2">
      {item.variants.map(variant => <div key={variant.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg bg-white/70 px-3 py-2 text-sm">
        <dt className="min-w-0 break-words text-stone-600">{variant.name}{variant.nameNe && <span lang="ne" className="ml-1">{variant.nameNe}</span>}
          {(!item.isAvailable || !variant.isAvailable) && <span className="ml-2 text-xs font-medium text-stone-700">Sold out</span>}</dt>
        <dd className="font-medium tabular-nums">{formatPrice(variant.priceMinor)}</dd>
      </div>)}
    </dl>}
  </article>;
}

export function PublicMenu({ menu, isDemo = false }: { menu: PublishedMenu; isDemo?: boolean }) {
  const phone = phoneHref(menu.phone);
  const map = safeMapUrl(menu.mapUrl);
  const hours = openingHoursEntries(menu.openingHours);
  const updated = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" }).format(new Date(menu.updatedAt));
  const style = { "--menu-accent": accessibleAccent(menu.themeColor) } as CSSProperties;
  return <main style={style} className="mx-auto w-full max-w-2xl px-5 pb-12 sm:px-8">
    {isDemo && <div className="border-b border-stone-200 py-4 text-center text-xs font-medium tracking-wide text-stone-600">EXAMPLE MENU · ILLUSTRATIVE PRICES</div>}
    <MenuImage publicId={menu.coverPublicId} version={menu.coverVersion} alt="" kind="cover" />
    <header className="py-10 text-center">
      <MenuImage publicId={menu.logoPublicId} version={menu.logoVersion} alt={`${menu.name} logo`} kind="logo" />
      {menu.address && <p className="text-xs font-semibold uppercase leading-5 tracking-[0.15em] text-[var(--menu-accent)]">{menu.address}</p>}
      <h1 className="mt-5 break-words font-serif text-5xl tracking-tight sm:text-6xl">{menu.name}</h1>
      {menu.nameNe && <p lang="ne" className="mt-3 text-lg text-stone-600">{menu.nameNe}</p>}
      {menu.description && <p className="mx-auto mt-5 max-w-sm whitespace-pre-line break-words text-sm leading-6 text-stone-600">{menu.description}</p>}
      {(phone || map) && <div className="mt-6 flex justify-center gap-3 text-sm font-medium text-[var(--menu-accent)]">
        {phone && <a href={phone} className="rounded-full border border-current px-5 py-3">Call restaurant</a>}
        {map && <a href={map} target="_blank" rel="noopener noreferrer" className="rounded-full border border-current px-5 py-3">Directions ↗</a>}
      </div>}
      {!!hours.length && <details className="mx-auto mt-6 max-w-sm text-sm text-stone-600"><summary className="cursor-pointer py-2">Opening hours</summary>
        <dl className="mt-3 space-y-2 text-left">{hours.map(([day, value]) => <div key={day} className="flex justify-between gap-4"><dt>{day}</dt><dd>{value}</dd></div>)}</dl>
      </details>}
    </header>
    {!!menu.categories.length && <nav aria-label="Menu categories" className="sticky top-0 z-10 -mx-5 flex gap-2 overflow-x-auto border-y border-stone-200 bg-[#faf8f2] px-5 py-3 sm:-mx-8 sm:px-8">
      {menu.categories.map(category => <a key={category.id} href={`#category-${category.id}`} className="shrink-0 rounded-full border border-stone-300 px-4 py-3 text-xs font-medium text-[var(--menu-accent)] hover:bg-stone-100">{category.name}</a>)}
    </nav>}
    {!menu.categories.some(category => category.items.length) && <p className="rounded-2xl border border-stone-200 p-6 text-center leading-7 text-stone-600">The kitchen is preparing this menu. Please check back soon.</p>}
    {menu.categories.map(category => <section key={category.id} id={`category-${category.id}`} className="scroll-mt-24 pt-10">
      <h2 className="mb-2 break-words font-serif text-3xl">{category.name}</h2>
      {category.nameNe && <p lang="ne" className="text-sm text-stone-600">{category.nameNe}</p>}
      {category.items.map(item => <MenuItemCard key={item.id} item={item} />)}
    </section>)}
    <footer className="mt-10 text-center text-xs leading-6 text-stone-600">
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
