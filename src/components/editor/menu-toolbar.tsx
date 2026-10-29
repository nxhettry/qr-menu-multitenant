"use client";
import { memo } from "react";
import type { CategoryNode } from "@/lib/editor/categories";
import type { MenuViewMode } from "@/hooks/use-menu-editor-view";
import { MenuIcon } from "@/components/menu/icon";

const views = [["list", "List view"], ["grid", "Grid view"]] as const;

export const MenuToolbar = memo(function MenuToolbar({ query, onQuery, view, onView, tree, onJump }: {
  query: string; onQuery: (value: string) => void; view: MenuViewMode; onView: (value: MenuViewMode) => void; tree: CategoryNode[]; onJump: (id: string) => void;
}) {
  return <div data-sticky-toolbar className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-line/70 bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
    <div className="flex items-center gap-2">
      <div className="relative flex min-w-0 flex-1 items-center rounded-full border border-line bg-surface pl-4 pr-1 text-ink-subtle shadow-card transition-shadow focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
        <MenuIcon name="search" className="h-[18px] w-[18px] shrink-0" />
        <input type="search" aria-label="Search items or categories" placeholder="Search items or categories…" value={query} onChange={event => onQuery(event.target.value)} maxLength={120}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-ink-subtle sm:text-[15px] [&::-webkit-search-cancel-button]:hidden" />
        {query && <button type="button" onClick={() => onQuery("")} aria-label="Clear search" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"><MenuIcon name="close" className="h-4 w-4" /></button>}
      </div>
      <div role="group" aria-label="Layout" className="flex shrink-0 rounded-full border border-line bg-surface-muted p-1">
        {views.map(([value, label]) => <button key={value} type="button" aria-label={label} aria-pressed={view === value} onClick={() => onView(value)}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${view === value ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}><MenuIcon name={value} className="h-[18px] w-[18px]" /></button>)}
      </div>
    </div>
    {tree.length > 1 && <nav aria-label="Jump to category" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
      {tree.map(category => <button key={category.id} type="button" onClick={() => onJump(category.id)}
        className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-ink">{category.name}</button>)}
    </nav>}
  </div>;
});
