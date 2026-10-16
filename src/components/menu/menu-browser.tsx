"use client";
import type { PublishedMenu } from "@/lib/menu/schema";
import { usePublicMenu } from "@/hooks/use-public-menu";
import { MenuItemCard } from "./item-card";
import { MenuIcon } from "./icon";
import { SpecialsBanner } from "./specials-banner";

export function MenuBrowser({ menu }: { menu: PublishedMenu }) {
  const { query, setQuery, selection, setSelection, filtered, specials, searching } = usePublicMenu(menu.categories);
  const count = filtered.reduce((total, category) => total + category.items.length, 0);
  const chip = (id: string) => `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-colors ${selection === id ? "bg-[var(--menu-accent)] text-white shadow-sm" : "bg-[#eee8e0] text-[#493726] hover:bg-[#e5ddd2]"}`;
  return <div>
    <div className="sticky top-0 z-30 -mx-1 bg-[#faf8f2]/95 px-1 pb-3 pt-2 backdrop-blur-sm">
      <div className="relative flex items-center rounded-2xl border border-[#ded6cb] bg-[#fffdf9] px-4 text-[#5e4735]">
        <MenuIcon name="search" className="h-5 w-5 shrink-0" />
        <input type="search" aria-label="Search items or categories" placeholder="Search for dishes or categories…" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-stone-900 outline-none placeholder:text-stone-500 sm:min-h-14" />
        {query && <button onClick={() => setQuery("")} aria-label="Clear search" className="flex h-10 w-10 shrink-0 items-center justify-center text-lg">×</button>}
      </div>
      <nav aria-label="Menu categories" className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button aria-pressed={selection === "all"} onClick={() => setSelection("all")} className={chip("all")}><MenuIcon name="bowl" className="h-4 w-4" />All dishes</button>
        {!!specials.length && <button aria-pressed={selection === "specials"} onClick={() => setSelection("specials")} className={chip("specials")}><MenuIcon name="flame" className="h-4 w-4" />Specials</button>}
        {menu.categories.map(category => <button key={category.id} aria-pressed={selection === category.id} onClick={() => setSelection(category.id)} className={chip(category.id)}>{category.name}</button>)}
      </nav>
    </div>
    {!query.trim() && (selection === "all" || selection === "specials") && <SpecialsBanner specials={specials} coverPublicId={menu.coverPublicId} coverVersion={menu.coverVersion} />}
    <div id="menu-items" aria-busy={searching} className="scroll-mt-36">
      <div className="mb-5 mt-6 flex items-baseline justify-between gap-3"><h2 className="font-serif text-3xl font-bold tracking-tight">{query.trim() ? "Search results" : selection === "specials" ? "House specials" : selection === "all" ? "Discover our menu" : menu.categories.find(category => category.id === selection)?.name}</h2><p role="status" className="shrink-0 text-xs text-stone-600">{count} {count === 1 ? "dish" : "dishes"}</p></div>
      {!count && <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center"><MenuIcon name="search" className="mx-auto h-7 w-7 text-stone-400" /><h3 className="mt-4 font-serif text-xl">{query ? "No matching dishes" : "The kitchen is preparing this menu"}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{query ? "Try another dish or category name, or explore the full menu." : "Please check back soon, or choose another category."}</p>{(query || selection !== "all") && <button onClick={() => { setQuery(""); setSelection("all"); }} className="mt-5 rounded-full bg-[var(--menu-accent)] px-5 py-3 text-xs font-semibold text-white">Show all dishes</button>}</div>}
      {filtered.map(category => <section key={category.id} aria-label={category.name} className="mb-8">
        {(selection === "all" || query.trim()) && <div className="mb-3 flex items-baseline gap-3"><h2 className="text-xs font-bold uppercase tracking-[0.13em] text-[#846849]">{category.name}</h2>{category.nameNe && <p lang="ne" className="text-xs text-stone-600">{category.nameNe}</p>}</div>}
        <div className="grid grid-cols-2 items-start gap-3 sm:gap-5 lg:grid-cols-3">{category.items.map(item => <MenuItemCard key={item.id} item={item} />)}</div>
      </section>)}
    </div>
  </div>;
}
