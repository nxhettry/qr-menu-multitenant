"use client";
import type { PublishedMenu } from "@/lib/menu/schema";
import { usePublicMenu } from "@/hooks/use-public-menu";
import { MenuItemCard } from "./item-card";
import { MenuIcon } from "./icon";
import { SpecialsBanner } from "./specials-banner";

const chipBase = "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors";
const chipClass = (active: boolean) => `${chipBase} ${active ? "bg-accent text-on-accent shadow-sm" : "border border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"}`;
const subChipClass = (active: boolean) => `${chipBase} min-h-10 px-3.5 text-xs ${active ? "bg-ink text-canvas" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`;
const scrollRow = "-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-7 sm:px-7 [&::-webkit-scrollbar]:hidden";

export function MenuBrowser({ menu }: { menu: PublishedMenu }) {
  const { query, setQuery, selection, setSelection, subcategory, setSubcategory, subcategories, filtered, specials, searching } = usePublicMenu(menu.categories);
  const count = filtered.reduce((total, category) => total + category.items.length, 0);
  const searchingText = !!query.trim();
  const heading = searchingText ? "Search results" : selection === "specials" ? "House specials" : selection === "all" ? "Discover our menu" : menu.categories.find(category => category.id === selection)?.name;
  return <div>
    <div className="sticky top-0 z-30 -mx-4 border-b border-line/70 bg-canvas/85 px-4 pb-3 pt-3 backdrop-blur-xl sm:-mx-7 sm:px-7">
      <div className="relative flex items-center rounded-full border border-line bg-surface pl-4 pr-1 text-ink-subtle shadow-card transition-shadow focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
        <MenuIcon name="search" className="h-[18px] w-[18px] shrink-0" />
        <input type="search" aria-label="Search items or categories" placeholder="Search dishes or categories…" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle [&::-webkit-search-cancel-button]:hidden" />
        {query && <button onClick={() => setQuery("")} aria-label="Clear search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"><MenuIcon name="close" className="h-4 w-4" /></button>}
      </div>
      <nav aria-label="Menu categories" className={`${scrollRow} mt-3`}>
        <button aria-pressed={selection === "all"} onClick={() => setSelection("all")} className={chipClass(selection === "all")}><MenuIcon name="bowl" className="h-4 w-4" />All dishes</button>
        {!!specials.length && <button aria-pressed={selection === "specials"} onClick={() => setSelection("specials")} className={chipClass(selection === "specials")}><MenuIcon name="flame" className="h-4 w-4" />Specials</button>}
        {menu.categories.map(category => <button key={category.id} aria-pressed={selection === category.id} onClick={() => setSelection(category.id)} className={chipClass(selection === category.id)}>{category.name}</button>)}
      </nav>
      {!!subcategories.length && <nav aria-label="Menu subcategories" className={`${scrollRow} mt-2`}>
        <button aria-pressed={!subcategory} onClick={() => setSubcategory("")} className={subChipClass(!subcategory)}>All types</button>
        {subcategories.map(name => <button key={name} aria-pressed={subcategory === name} onClick={() => setSubcategory(name)} className={subChipClass(subcategory === name)}>{name}</button>)}
      </nav>}
    </div>
    {!searchingText && !subcategory && (selection === "all" || selection === "specials") && <SpecialsBanner specials={specials} coverPublicId={menu.coverPublicId} coverVersion={menu.coverVersion} />}
    <div id="menu-items" aria-busy={searching} className="scroll-mt-64">
      <div className="mb-5 mt-7 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{heading}</h2>
        <p role="status" className="shrink-0 pb-1 text-xs font-medium text-ink-subtle">{count} {count === 1 ? "dish" : "dishes"}</p>
      </div>
      {!count && <div className="rounded-3xl border border-dashed border-line-strong px-6 py-12 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-subtle"><MenuIcon name="search" className="h-5 w-5" /></span>
        <h3 className="mt-4 text-lg font-semibold">{query ? "No matching dishes" : "The kitchen is preparing this menu"}</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">{query ? "Try another dish or category name, or explore the full menu." : "Please check back soon, or choose another category."}</p>
        {(query || selection !== "all") && <button onClick={() => { setQuery(""); setSelection("all"); }} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent">Show all dishes</button>}
      </div>}
      {filtered.map(category => <section key={category.id} aria-label={category.name} className="mb-10">
        {(selection === "all" || searchingText) && <div className="mb-4 flex items-baseline gap-2.5 border-b border-line pb-2.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">{category.name}</h2>
          {category.nameNe && <p lang="ne" className="text-xs text-ink-subtle">{category.nameNe}</p>}
          <span className="ml-auto text-xs text-ink-subtle">{category.items.length}</span>
        </div>}
        <div className="grid grid-cols-2 items-start gap-3 sm:gap-5 lg:grid-cols-3">{category.items.map(item => <MenuItemCard key={item.id} item={item} />)}</div>
      </section>)}
    </div>
  </div>;
}
