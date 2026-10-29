"use client";
import { memo, type DragEvent } from "react";
import type { EditorCategory, EditorItem } from "@/lib/editor/data";
import type { MenuViewMode } from "@/hooks/use-menu-editor-view";
import { cloudinaryImageUrl, formatPrice } from "@/lib/menu/presentation";
import { cardClass } from "@/components/ui/form";
import { ActionMenu } from "@/components/ui/action-menu";
import { MenuIcon } from "@/components/menu/icon";
import { MenuImageDisplay } from "@/components/menu-image-display";
import type { MenuEditorActions } from "./menu-actions";

type EntryProps = { item: EditorItem; category: EditorCategory; index: number; view: MenuViewMode; actions: MenuEditorActions };

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const badgeClass = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold";
const overlayButton = "text-left transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand focus-visible:outline-none focus-visible:underline disabled:hover:text-ink";

function Thumbnail({ item, grid }: { item: EditorItem; grid: boolean }) {
  const src = cloudinaryImageUrl(cloudName, item.image_public_id, item.image_version, grid ? 320 : 96, grid ? 240 : 96);
  const shape = grid ? "aspect-[4/3] w-full rounded-t-2xl" : "h-12 w-12 rounded-xl";
  if (!src) return <span aria-hidden="true" className={`${shape} flex shrink-0 items-center justify-center bg-surface-muted text-ink-subtle`}><MenuIcon name="bowl" className={grid ? "h-8 w-8" : "h-5 w-5"} /></span>;
  return <MenuImageDisplay key={src} src={src} alt="" width={grid ? 320 : 96} height={grid ? 240 : 96} className={`${shape} shrink-0 object-cover`} />;
}

function ItemMeta({ item }: { item: EditorItem }) {
  return <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
    <span>{item.price_minor !== null ? formatPrice(item.price_minor) : `${item.variants.length} variants`}</span>
    {!item.is_visible && <span className={`${badgeClass} bg-surface-muted text-ink-muted ring-1 ring-line`}>Hidden</span>}
    {item.is_featured && <span className={`${badgeClass} bg-brand-soft text-brand`}>Special</span>}
    {item.is_example_price && <span className={`${badgeClass} bg-warning-soft text-warning`}>Review price</span>}
  </div>;
}

function AvailabilityToggle({ item, actions, className = "" }: { item: EditorItem; actions: MenuEditorActions; className?: string }) {
  return <button type="button" disabled={actions.disabled} aria-pressed={item.is_available} onClick={() => actions.setAvailable(item)}
    className={`relative z-10 inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${item.is_available ? "bg-success-soft text-success" : "bg-surface-muted text-ink-muted ring-1 ring-line"} ${className}`}>
    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${item.is_available ? "bg-success" : "bg-ink-subtle"}`} />{item.is_available ? "Available" : "Sold out"}
  </button>;
}

function ItemControls({ item, category, index, actions, className = "" }: Omit<EntryProps, "view"> & { className?: string }) {
  const { disabled, reorderable } = actions;
  return <div className={`flex items-center ${className}`}>
    {reorderable && <button type="button" disabled={disabled} draggable={!disabled} onDragStart={event => actions.dragStart(event, "item", item.id, category.id)} aria-label={`Drag to reorder ${item.name}`}
      className="relative z-10 hidden h-11 w-9 cursor-grab items-center justify-center rounded-full text-ink-subtle hover:bg-surface-muted hover:text-ink disabled:opacity-50 sm:flex"><MenuIcon name="drag" className="h-5 w-5" /></button>}
    <ActionMenu label={`More actions for ${item.name}`} disabled={disabled} actions={[
      { label: "Edit item", onSelect: () => actions.editItem(item) },
      { label: item.image_public_id ? "Change photo" : "Add photo", onSelect: () => actions.itemPhoto(item) },
      { label: item.is_visible ? "Hide from menu" : "Show on menu", onSelect: () => actions.setVisible(item) },
      reorderable && { label: "Move up", disabled: index === 0, onSelect: () => actions.moveItem(category, index, -1) },
      reorderable && { label: "Move down", disabled: index === category.items.length - 1, onSelect: () => actions.moveItem(category, index, 1) },
      { label: "Remove item", tone: "danger", onSelect: () => actions.remove("item", item.id, item.name) },
    ]} />
  </div>;
}

export const MenuItemEntry = memo(function MenuItemEntry({ item, category, index, view, actions }: EntryProps) {
  const dropProps = { onDragOver: actions.dragOver, onDrop: (event: DragEvent) => actions.drop(event, "item", item.id, category.id) };
  const title = <button type="button" disabled={actions.disabled} onClick={() => actions.editItem(item)} className={overlayButton}>{item.name}</button>;
  if (view === "grid") return <li {...dropProps} className={`${cardClass} relative flex flex-col transition-shadow hover:shadow-lift ${item.is_visible ? "" : "opacity-75"}`}>
    <Thumbnail item={item} grid />
    <div className="flex flex-1 flex-col p-3">
      <h4 className="break-words text-sm font-semibold leading-5">{title}</h4>
      <ItemMeta item={item} />
      <div className="mt-auto pt-3"><AvailabilityToggle item={item} actions={actions} className="w-full justify-center" /></div>
    </div>
    <ItemControls item={item} category={category} index={index} actions={actions} className="absolute right-1.5 top-1.5 rounded-full bg-surface/90 shadow-card backdrop-blur" />
  </li>;
  return <li {...dropProps} className={`relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] ${item.is_visible ? "" : "opacity-75"}`}>
    <div className="row-span-2 self-start sm:row-span-1 sm:self-center"><Thumbnail item={item} grid={false} /></div>
    <div className="min-w-0"><h4 className="break-words font-medium leading-6">{title}</h4><ItemMeta item={item} /></div>
    <ItemControls item={item} category={category} index={index} actions={actions} className="col-start-3 row-start-1 sm:col-start-4" />
    <AvailabilityToggle item={item} actions={actions} className="col-start-2 row-start-2 justify-self-start sm:col-start-3 sm:row-start-1" />
  </li>;
});
