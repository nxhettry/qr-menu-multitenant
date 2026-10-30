"use client";
import { memo } from "react";
import type { EditorCategory } from "@/lib/editor/data";
import type { CategoryNode } from "@/lib/editor/categories";
import { categoryAnchor, type MenuViewMode } from "@/hooks/use-menu-editor-view";
import { cardClass } from "@/components/ui/form";
import { ActionMenu } from "@/components/ui/action-menu";
import { MenuIcon } from "@/components/menu/icon";
import type { MenuEditorActions } from "./menu-actions";
import { MenuItemEntry } from "./menu-item-entry";
import type { VatRule } from "@/lib/menu/vat";

type SectionProps = {
  category: EditorCategory; subcategories?: CategoryNode["children"]; siblings: EditorCategory[]; parentVisible: boolean;
  view: MenuViewMode; vat: VatRule; actions: MenuEditorActions; isExpanded: (id: string) => boolean; toggle: (id: string) => void;
};

const addClass = "inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-sm font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50";
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function summary(category: EditorCategory, subcategories: EditorCategory[] | undefined) {
  const items = category.items.length + (subcategories ?? []).reduce((total, child) => total + child.items.length, 0);
  return [plural(items, "item", "items"), subcategories?.length ? plural(subcategories.length, "subcategory", "subcategories") : ""].filter(Boolean).join(" · ");
}

export const CategorySection = memo(function CategorySection({ category, subcategories, siblings, parentVisible, view, vat, actions, isExpanded, toggle }: SectionProps) {
  const nested = !!category.parent_id;
  const open = isExpanded(category.id);
  const visible = category.is_visible && parentVisible;
  const bodyId = `${categoryAnchor(category.id)}-body`;
  const position = siblings.findIndex(entry => entry.id === category.id);
  const { disabled, reorderable } = actions;
  return <section id={categoryAnchor(category.id)} onDragOver={actions.dragOver} onDrop={event => actions.drop(event, "category", category.id, category.parent_id ?? undefined)}
    className={nested ? "rounded-2xl border border-line border-l-4 border-l-brand/50 bg-surface-muted/70" : cardClass}>
    <header className="flex items-center gap-1 py-2 pl-2 pr-1.5 sm:py-3 sm:pl-3">
      <div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1 hover:bg-surface-muted/70">
        <MenuIcon name="chevron" className={`h-5 w-5 shrink-0 text-ink-subtle transition-transform ${open ? "" : "-rotate-90"}`} />
        {nested ? <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-subtle ring-1 ring-line">↳</span>
          : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-base font-semibold uppercase text-brand">{Array.from(category.name)[0]}</span>}
        <div className="min-w-0">
          {nested && <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Subcategory</p>}
          <h3 className={`break-words font-semibold tracking-tight ${nested ? "text-base" : "text-lg"}`}>
            <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => toggle(category.id)} className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:underline">{category.name}</button>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
            {category.name_ne && <span lang="ne">{category.name_ne}</span>}
            <span>{summary(category, subcategories)}</span>
            {!visible && <span className="rounded-full bg-surface px-2 py-0.5 font-semibold text-ink-muted ring-1 ring-line">Hidden</span>}
          </p>
        </div>
      </div>
      {reorderable && <button type="button" disabled={disabled} draggable={!disabled} onDragStart={event => actions.dragStart(event, "category", category.id, category.parent_id ?? undefined)} aria-label={`Drag to reorder ${category.name}`}
        className="hidden h-11 w-9 cursor-grab items-center justify-center rounded-full text-ink-subtle hover:bg-surface-muted hover:text-ink disabled:opacity-50 sm:flex"><MenuIcon name="drag" className="h-5 w-5" /></button>}
      <ActionMenu label={`Actions for ${category.name}`} disabled={disabled} actions={[
        { label: nested ? "Edit subcategory" : "Edit category", onSelect: () => actions.editCategory(category) },
        { label: "Add item", onSelect: () => actions.addItem(category.id) },
        !nested && { label: "Add subcategory", onSelect: () => actions.addSubcategory(category.id) },
        reorderable && { label: "Move up", disabled: position <= 0, onSelect: () => actions.moveCategory(category, -1) },
        reorderable && { label: "Move down", disabled: position === siblings.length - 1, onSelect: () => actions.moveCategory(category, 1) },
        { label: nested ? "Remove subcategory" : "Remove category", tone: "danger", onSelect: () => actions.remove("category", category.id, category.name) },
      ]} />
    </header>
    {open && <div id={bodyId} className={`border-t px-3 pb-3 sm:px-4 sm:pb-4 ${nested ? "border-line/70" : "border-line"}`}>
      {category.items.length > 0 && <ul className={view === "grid" ? "grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3" : "divide-y divide-line"}>
        {category.items.map((item, index) => <MenuItemEntry key={item.id} item={item} category={category} index={index} view={view} vat={vat} actions={actions} />)}
      </ul>}
      {!category.items.length && !subcategories?.length && <p className="pt-4 text-sm text-ink-muted">No items yet.</p>}
      <div className="pt-3"><button type="button" disabled={disabled} onClick={() => actions.addItem(category.id)} className={addClass}>+ Add item</button></div>
      {subcategories && <div className="mt-4 space-y-3">
        {subcategories.map(child => <CategorySection key={child.id} category={child} siblings={subcategories} parentVisible={visible} view={view} vat={vat} actions={actions} isExpanded={isExpanded} toggle={toggle} />)}
        <button type="button" disabled={disabled} onClick={() => actions.addSubcategory(category.id)} className={addClass}>+ Add subcategory</button>
      </div>}
    </div>}
  </section>;
});
