"use client";
import { useCallback, useState, type DragEvent } from "react";
import Link from "next/link";
import type { EditorCategory, EditorData, EditorItem } from "@/lib/editor/data";
import { formatPrice } from "@/lib/menu/presentation";
import { useMenuEditor } from "@/hooks/use-menu-editor";
import { CategoryForm } from "./category-form";
import { ItemForm } from "./item-form";
import { SettingsForm } from "./settings-form";
import { ImageUploader } from "./image-uploader";
import { primaryClass, secondaryClass } from "./form-fields";

type Editing = { kind: "category"; category?: EditorCategory } | { kind: "item"; categoryId: string; item?: EditorItem } | null;
const dragType = "application/x-qrmenu-order";

function dragEntry(event: DragEvent, kind: "category" | "item", id: string, categoryId?: string) {
  event.dataTransfer.setData(dragType, JSON.stringify({ kind, id, categoryId }));
  event.dataTransfer.effectAllowed = "move";
}

export function MenuEditor({ userId, restaurantId, initialData, canEdit, canManage }: {
  userId: string; restaurantId: string; initialData: EditorData; canEdit: boolean; canManage: boolean;
}) {
  const { data, error, pending, result, save, refresh, isValidating } = useMenuEditor(userId, restaurantId, initialData);
  const [tab, setTab] = useState<"menu" | "settings">("menu");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<{ kind: "category" | "item"; id: string; name: string } | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);
  const closeEditor = useCallback(() => setEditing(null), []);
  const refreshImages = useCallback(() => refresh(), [refresh]);
  if (error || !data) return <div role="alert" className="mt-8 rounded-2xl border border-red-200 p-6"><p>We couldn’t refresh this restaurant. Sign in again or try loading it again.</p><button onClick={() => void refresh()} className={`${secondaryClass} mt-4`}>Try again</button><Link href="/dashboard" className="ml-4 text-sm underline">Your restaurants</Link></div>;
  const { restaurant, categories } = data;
  const disabled = pending || !canEdit;
  function reorder(kind: "category" | "item", entries: { id: string }[], index: number, offset: number, categoryId?: string) {
    const ids = entries.map(entry => entry.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    save({ operation: "reorder", payload: { kind, ids, category_id: categoryId } });
  }
  function dropEntry(event: DragEvent, kind: "category" | "item", entries: { id: string }[], index: number, categoryId?: string) {
    if (!event.dataTransfer.types.includes(dragType) || disabled) return;
    event.preventDefault(); event.stopPropagation();
    try {
      const source = JSON.parse(event.dataTransfer.getData(dragType));
      if (source.kind !== kind || source.categoryId !== categoryId) return;
      const from = entries.findIndex(entry => entry.id === source.id);
      if (from < 0 || from === index) return;
      const ids = entries.map(entry => entry.id);
      const [moved] = ids.splice(from, 1); ids.splice(index, 0, moved);
      save({ operation: "reorder", payload: { kind, ids, category_id: categoryId } });
    } catch { return; }
  }
  function image(kind: "logo" | "cover" | "item", publicId: string | null, version: number | null, itemId?: string) {
    return <ImageUploader restaurantId={restaurantId} kind={kind} itemId={itemId} publicId={publicId} version={version}
      disabled={pending || (kind === "item" ? !canEdit : !canManage)} onSaved={refreshImages}
      onRemove={() => save({ operation: "removeImage", payload: { kind, item_id: itemId } })} />;
  }
  return <div className="mt-9 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-orange-800">{restaurant.status}</p><h1 className="mt-3 break-words font-serif text-4xl">{restaurant.name}</h1><p className="mt-3 text-sm text-stone-600">/{restaurant.slug}</p></div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/${restaurantId}/preview`} target="_blank" className={secondaryClass}>Phone preview ↗</Link>
        {restaurant.status === "PUBLISHED" && <Link href={`/${restaurant.slug}`} target="_blank" className={secondaryClass}>View live ↗</Link>}
        {canManage && <button disabled={pending} className={primaryClass} onClick={() => restaurant.status === "PUBLISHED" ? setUnpublishing(true) : save({ operation: "visibility", payload: { published: true } })}>{pending ? "Saving…" : restaurant.status === "PUBLISHED" ? "Unpublish" : "Publish menu"}</button>}
      </div>
    </header>
    {!canEdit && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Editing is currently locked. You can still view your saved menu.</p>}
    {restaurant.status === "PUBLISHED" && <p className="text-sm leading-6 text-stone-600">Saved edits go live immediately. Preview your changes before sharing your menu.</p>}
    <div role={result.error ? "alert" : "status"} aria-live="polite" className={result.error ? "sticky top-3 z-20 rounded-xl bg-red-50 p-4 text-sm text-red-800 shadow-sm" : result.message || result.warning ? "sticky top-3 z-20 rounded-xl bg-green-50 p-4 text-sm text-green-900 shadow-sm" : ""}>{result.error ?? result.warning ?? result.message}</div>
    {unpublishing && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm leading-6">Hide this menu from guests? Your QR code will keep working and show an unavailable message until you publish again.</p><div className="mt-4 flex gap-3"><button disabled={pending} className={primaryClass} onClick={() => save({ operation: "visibility", payload: { published: false } }, () => setUnpublishing(false))}>Unpublish menu</button><button disabled={pending} className={secondaryClass} onClick={() => setUnpublishing(false)}>Cancel</button></div></div>}
    {deleting && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5"><p className="break-words text-sm">Remove “{deleting.name}” from your menu?</p><div className="mt-4 flex gap-3"><button disabled={disabled} onClick={() => save({ operation: "delete", payload: { kind: deleting.kind, id: deleting.id } }, () => setDeleting(null))} className={primaryClass}>Remove {deleting.kind}</button><button disabled={pending} onClick={() => setDeleting(null)} className={secondaryClass}>Cancel</button></div></div>}
    <nav aria-label="Restaurant workspace" className="flex gap-2 border-b border-stone-200 pb-4"><button aria-current={tab === "menu" ? "page" : undefined} className={tab === "menu" ? primaryClass : secondaryClass} onClick={() => setTab("menu")}>Menu</button><button aria-current={tab === "settings" ? "page" : undefined} className={tab === "settings" ? primaryClass : secondaryClass} onClick={() => setTab("settings")}>Settings & images</button></nav>
    {tab === "settings" ? <div className="space-y-6">
      {!canManage && <p className="text-sm text-stone-600">Only owners and managers can change restaurant settings.</p>}
      <SettingsForm key={restaurant.id} restaurant={restaurant} pending={pending} disabled={!canManage} onSave={payload => save({ operation: "settings", payload })} />
      <div className="grid gap-5 sm:grid-cols-2">{image("logo", restaurant.logo_public_id, restaurant.logo_version)}{image("cover", restaurant.cover_public_id, restaurant.cover_version)}</div>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">Your menu</h2><button disabled={disabled} onClick={() => setEditing({ kind: "category" })} className={secondaryClass}>+ Add category</button></div>
      {editing?.kind === "category" && <CategoryForm key={editing.category?.id ?? "new"} category={editing.category} pending={pending} onCancel={closeEditor} onSave={payload => save({ operation: "saveCategory", payload }, closeEditor)} />}
      {editing?.kind === "item" && <ItemForm key={editing.item?.id ?? `new-${editing.categoryId}`} item={editing.item} categoryId={editing.categoryId} categories={categories} pending={pending} onCancel={closeEditor} onSave={payload => save({ operation: "saveItem", payload }, closeEditor)} />}
      {!categories.length && <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center"><h3 className="text-lg font-semibold">Start with a category.</h3><p className="mt-3 text-sm leading-6 text-stone-600">Try Momo, Snacks, or Tea & Coffee. Then add your first item and price.</p></div>}
      {categories.map((category, categoryIndex) => <section key={category.id} onDragOver={event => { if (event.dataTransfer.types.includes(dragType)) event.preventDefault(); }} onDrop={event => dropEntry(event, "category", categories, categoryIndex)} className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="break-words text-xl font-semibold">{category.name}</h3><p className="mt-1 text-xs text-stone-600">{category.is_visible ? "Visible to guests" : "Hidden from guests"} · {category.items.length} {category.items.length === 1 ? "item" : "items"}</p></div><div className="flex flex-wrap gap-2">
          <button disabled={disabled} draggable={!disabled} onDragStart={event => dragEntry(event, "category", category.id)} aria-label={`Drag to reorder ${category.name}; use adjacent arrows on touch screens`} className={`${secondaryClass} cursor-grab`}>↕</button>
          <button disabled={disabled || categoryIndex === 0} onClick={() => reorder("category", categories, categoryIndex, -1)} aria-label={`Move ${category.name} up`} className={secondaryClass}>↑</button>
          <button disabled={disabled || categoryIndex === categories.length - 1} onClick={() => reorder("category", categories, categoryIndex, 1)} aria-label={`Move ${category.name} down`} className={secondaryClass}>↓</button>
          <button disabled={disabled} onClick={() => { setEditing({ kind: "category", category }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={secondaryClass}>Edit</button>
          <button disabled={disabled} onClick={() => setDeleting({ kind: "category", id: category.id, name: category.name })} className={secondaryClass}>Remove</button>
        </div></header>
        <ul className="mt-4 divide-y divide-stone-200">{category.items.map((item, itemIndex) => <li key={item.id} onDragOver={event => { if (event.dataTransfer.types.includes(dragType)) event.preventDefault(); }} onDrop={event => dropEntry(event, "item", category.items, itemIndex, category.id)} className="py-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words font-medium">{item.name}</h4><p className="mt-1 text-sm text-stone-600">{item.price_minor !== null ? formatPrice(item.price_minor) : `${item.variants.length} variants`}{item.is_example_price ? " · Example prices — review required" : ""}</p></div>
            <button disabled={disabled} aria-pressed={item.is_available} onClick={() => save({ operation: "availability", payload: { id: item.id, available: !item.is_available } })} className={`${secondaryClass} ${item.is_available ? "text-green-800" : "text-stone-600"}`}>{item.is_available ? "Available today" : "Sold out"}</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={disabled} draggable={!disabled} onDragStart={event => dragEntry(event, "item", item.id, category.id)} aria-label={`Drag to reorder ${item.name}; use adjacent arrows on touch screens`} className={`${secondaryClass} cursor-grab`}>↕</button>
            <button disabled={disabled || itemIndex === 0} onClick={() => reorder("item", category.items, itemIndex, -1, category.id)} aria-label={`Move ${item.name} up`} className={secondaryClass}>↑</button>
            <button disabled={disabled || itemIndex === category.items.length - 1} onClick={() => reorder("item", category.items, itemIndex, 1, category.id)} aria-label={`Move ${item.name} down`} className={secondaryClass}>↓</button>
            <button disabled={disabled} onClick={() => { setEditing({ kind: "item", categoryId: category.id, item }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={secondaryClass}>Edit item</button>
            <button disabled={disabled} onClick={() => setDeleting({ kind: "item", id: item.id, name: item.name })} className={secondaryClass}>Remove</button>
          </div>
          <details className="mt-3"><summary className="cursor-pointer py-2 text-sm text-stone-600">Item photo</summary><div className="mt-2">{image("item", item.image_public_id, item.image_version, item.id)}</div></details>
        </li>)}</ul>
        <button disabled={disabled} onClick={() => { setEditing({ kind: "item", categoryId: category.id }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`${secondaryClass} mt-4`}>+ Add item</button>
      </section>)}
    </>}
    <button disabled={isValidating || pending} onClick={() => void refresh()} className="py-3 text-sm text-stone-600 disabled:opacity-50">{isValidating ? "Refreshing…" : "Refresh menu"}</button>
  </div>;
}
