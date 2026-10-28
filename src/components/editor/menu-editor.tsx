"use client";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { EditorCategory, EditorData, EditorItem } from "@/lib/editor/data";
import { formatPrice } from "@/lib/menu/presentation";
import { useMenuEditor } from "@/hooks/use-menu-editor";
import { CategoryForm } from "./category-form";
import { ItemForm } from "./item-form";
import { SettingsForm } from "./settings-form";
import { ImageUploader } from "./image-uploader";
import { cardClass, checkboxClass, dangerClass, darkClass, iconClass, noticeClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { categoryLabel, orderedCategories } from "@/lib/editor/categories";
import { MenuDisplayForm } from "./menu-display-form";
import { QrPanel } from "./qr-panel";

const BulkImport = dynamic(() => import("./bulk-import").then(module => module.BulkImport), { loading: () => <p role="status" className="text-sm text-ink-muted">Loading import tools…</p> });

type Editing = { kind: "category"; category?: EditorCategory; parentId?: string } | { kind: "item"; categoryId: string; item?: EditorItem } | null;
const dragType = "application/x-qrmenu-order";

function dragEntry(event: DragEvent, kind: "category" | "item", id: string, categoryId?: string) {
  event.dataTransfer.setData(dragType, JSON.stringify({ kind, id, categoryId }));
  event.dataTransfer.effectAllowed = "move";
}

export function MenuEditor({ userId, restaurantId, initialData, canEdit, canManage, siteOrigin }: {
  userId: string; restaurantId: string; initialData: EditorData; canEdit: boolean; canManage: boolean; siteOrigin: string;
}) {
  const { data, error, pending, result, save, refresh, isValidating } = useMenuEditor(userId, restaurantId, initialData);
  const [tab, setTab] = useState<"menu" | "settings" | "import" | "display" | "qr">("menu");
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const active = tabsRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && tabsRef.current) tabsRef.current.scrollTo({ left: active.offsetLeft - 16, behavior: "smooth" });
  }, [tab]);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<{ kind: "category" | "item"; id: string; name: string } | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);
  const closeEditor = useCallback(() => setEditing(null), []);
  const refreshImages = useCallback(() => refresh(), [refresh]);
  if (error || !data) return <div role="alert" className={`${noticeClass("danger")} mt-8`}><p>We couldn’t refresh this restaurant. Sign in again or try loading it again.</p><div className="mt-4 flex flex-wrap items-center gap-4"><button onClick={() => void refresh()} className={secondaryClass}>Try again</button><Link href="/dashboard" className="text-sm font-semibold underline">Your restaurants</Link></div></div>;
  const { restaurant, categories } = data;
  const disabled = pending || !canEdit;
  function reorder(kind: "category" | "item", entries: { id: string }[], index: number, offset: number, categoryId?: string) {
    const ids = entries.map(entry => entry.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    save({ operation: "reorder", payload: { kind, ids, category_id: categoryId } });
  }
  function reorderCategory(category: EditorCategory, offset: number) {
    const siblings = categories.filter(entry => entry.parent_id === category.parent_id);
    const siblingIndex = siblings.findIndex(entry => entry.id === category.id);
    const neighbor = siblings[siblingIndex + offset];
    if (!neighbor) return;
    const ids = categories.map(entry => entry.id === category.id ? neighbor.id : entry.id === neighbor.id ? category.id : entry.id);
    save({ operation: "reorder", payload: { kind: "category", ids } });
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
  const sectionAction = (action: () => void) => () => { action(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="mt-8 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${restaurant.status === "PUBLISHED" ? "bg-success-soft text-success" : "bg-surface-muted text-ink-muted"}`}><span className={`h-1.5 w-1.5 rounded-full ${restaurant.status === "PUBLISHED" ? "bg-success" : "bg-ink-subtle"}`} />{restaurant.status}</span><h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{restaurant.name}</h1><p className="mt-1 text-sm text-ink-subtle">/{restaurant.slug}</p></div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/${restaurantId}/preview`} target="_blank" className={secondaryClass}>Phone preview ↗</Link>
        {restaurant.status === "PUBLISHED" && <Link href={`/${restaurant.slug}`} target="_blank" className={secondaryClass}>View live ↗</Link>}
        {restaurant.status === "PUBLISHED" && tab !== "qr" && <button onClick={() => setTab("qr")} className={secondaryClass}>Get QR code</button>}
        {canManage && <button disabled={pending} className={restaurant.status === "PUBLISHED" ? darkClass : primaryClass} onClick={() => restaurant.status === "PUBLISHED" ? setUnpublishing(true) : save({ operation: "visibility", payload: { published: true } })}>{pending ? "Saving…" : restaurant.status === "PUBLISHED" ? "Unpublish" : "Publish menu"}</button>}
      </div>
    </header>
    {!canEdit && <p role="status" className={noticeClass("warning")}>Editing is currently locked. You can still view your saved menu.</p>}
    {restaurant.status === "PUBLISHED" && <p className="text-sm leading-6 text-ink-muted">Saved edits go live immediately. Preview your changes before sharing your menu.</p>}
    <div role={result.error ? "alert" : "status"} aria-live="polite" className={result.error ? `${noticeClass("danger")} sticky top-3 z-20 shadow-lift` : result.message || result.warning ? `${noticeClass("success")} sticky top-3 z-20 shadow-lift` : ""}>{result.error ?? result.warning ?? result.message}</div>
    {unpublishing && <div role="alert" className={noticeClass("warning")}><p>Hide this menu from guests? Your QR code will keep working and show an unavailable message until you publish again.</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={pending} className={darkClass} onClick={() => save({ operation: "visibility", payload: { published: false } }, () => setUnpublishing(false))}>Unpublish menu</button><button disabled={pending} className={secondaryClass} onClick={() => setUnpublishing(false)}>Cancel</button></div></div>}
    {deleting && <div role="alert" className={noticeClass("danger")}><p className="break-words">Remove “{deleting.name}” from your menu?</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={disabled} onClick={() => save({ operation: "delete", payload: { kind: deleting.kind, id: deleting.id } }, () => setDeleting(null))} className={dangerClass}>Remove {deleting.kind}</button><button disabled={pending} onClick={() => setDeleting(null)} className={secondaryClass}>Cancel</button></div></div>}
    <nav ref={tabsRef} aria-label="Restaurant workspace" className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"><div className="flex w-max gap-1 rounded-full border border-line bg-surface-muted p-1">{([['menu', 'Menu'], ['import', 'Bulk import'], ['display', 'Menu display'], ['settings', 'Settings & images'], ['qr', 'QR code']] as const).map(([value, label]) => <button key={value} aria-current={tab === value ? "page" : undefined} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${tab === value ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"}`} onClick={() => setTab(value)}>{label}</button>)}</div></nav>
    {tab === "qr" ? <QrPanel restaurantId={restaurantId} slug={restaurant.slug} shortCode={restaurant.short_code} published={restaurant.status === "PUBLISHED"} siteOrigin={siteOrigin} /> : tab === "import" ? <BulkImport categories={categories} pending={pending} disabled={!canEdit} onImport={save} /> : tab === "display" ? <MenuDisplayForm key={`${restaurant.id}-${restaurant.hidden_fields.join(',')}`} initialHiddenFields={restaurant.hidden_fields} pending={pending} disabled={!canManage} onSave={hidden_fields => save({ operation: "displaySettings", payload: { hidden_fields } })} /> : tab === "settings" ? <div className="space-y-6">
      {!canManage && <p className="text-sm text-ink-muted">Only owners and managers can change restaurant settings.</p>}
      <SettingsForm key={restaurant.id} restaurant={restaurant} pending={pending} disabled={!canManage} onSave={payload => save({ operation: "settings", payload })} />
      <div className="grid gap-5 sm:grid-cols-2">{image("logo", restaurant.logo_public_id, restaurant.logo_version)}{image("cover", restaurant.cover_public_id, restaurant.cover_version)}</div>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold tracking-tight">Your menu</h2><button disabled={disabled} onClick={() => setEditing({ kind: "category" })} className={secondaryClass}>+ Add category</button></div>
      {editing?.kind === "category" && <CategoryForm key={editing.category?.id ?? `new-${editing.parentId ?? 'root'}`} category={editing.category} categories={categories} parentId={editing.parentId} pending={pending} onCancel={closeEditor} onSave={payload => save({ operation: "saveCategory", payload }, closeEditor)} />}
      {editing?.kind === "item" && <ItemForm key={editing.item?.id ?? `new-${editing.categoryId}`} item={editing.item} categoryId={editing.categoryId} categories={categories} pending={pending} onCancel={closeEditor} onSave={payload => save({ operation: "saveItem", payload }, closeEditor)} />}
      {!categories.length && <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center"><h3 className="text-lg font-semibold">Start with a category.</h3><p className="mt-2 text-sm leading-6 text-ink-muted">Try Momo, Snacks, or Tea & Coffee. Then add your first item and price.</p></div>}
      {orderedCategories(categories).map(category => { const categoryIndex = categories.findIndex(entry => entry.id === category.id); const siblings = categories.filter(entry => entry.parent_id === category.parent_id); return <section key={category.id} onDragOver={event => { if (event.dataTransfer.types.includes(dragType)) event.preventDefault(); }} onDrop={event => dropEntry(event, "category", categories, categoryIndex, category.parent_id ?? undefined)} className={`${cardClass} p-5 sm:p-6 ${category.parent_id ? 'border-l-4 border-l-brand/40 sm:ml-6' : ''}`}>
        <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-lg font-semibold tracking-tight">{categoryLabel(category, categories)}</h3><p className="mt-1 text-xs text-ink-subtle">{category.is_visible && (!category.parent_id || categories.find(parent => parent.id === category.parent_id)?.is_visible) ? "Visible to guests" : "Hidden from guests"} · {category.items.length} {category.items.length === 1 ? "item" : "items"}</p></div><div className="flex flex-wrap gap-1.5">
          <button disabled={disabled} draggable={!disabled} onDragStart={event => dragEntry(event, "category", category.id, category.parent_id ?? undefined)} aria-label={`Drag to reorder ${category.name}; use adjacent arrows on touch screens`} className={`${iconClass} cursor-grab`}>↕</button>
          <button disabled={disabled || siblings[0]?.id === category.id} onClick={() => reorderCategory(category, -1)} aria-label={`Move ${category.name} up`} className={iconClass}>↑</button>
          <button disabled={disabled || siblings.at(-1)?.id === category.id} onClick={() => reorderCategory(category, 1)} aria-label={`Move ${category.name} down`} className={iconClass}>↓</button>
          <button disabled={disabled} onClick={sectionAction(() => setEditing({ kind: "category", category }))} className={secondaryClass}>Edit</button>
          <button disabled={disabled} onClick={() => setDeleting({ kind: "category", id: category.id, name: category.name })} className={secondaryClass}>Remove</button>
        </div></header>
        <ul className="mt-4 divide-y divide-line border-t border-line">{category.items.map((item, itemIndex) => <li key={item.id} onDragOver={event => { if (event.dataTransfer.types.includes(dragType)) event.preventDefault(); }} onDrop={event => dropEntry(event, "item", category.items, itemIndex, category.id)} className="py-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words font-medium">{item.name}</h4><p className="mt-0.5 text-sm text-ink-muted">{item.price_minor !== null ? formatPrice(item.price_minor) : `${item.variants.length} variants`}{item.is_example_price ? <span className="text-warning"> · Example prices — review required</span> : ""}</p></div>
            <button disabled={disabled} aria-pressed={item.is_available} onClick={() => save({ operation: "availability", payload: { id: item.id, available: !item.is_available } })} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-50 ${item.is_available ? "bg-success-soft text-success" : "bg-surface-muted text-ink-muted"}`}><span aria-hidden="true" className={`h-2 w-2 rounded-full ${item.is_available ? "bg-success" : "bg-ink-subtle"}`} />{item.is_available ? "Available today" : "Sold out"}</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <label className="flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm"><input aria-label={`Show ${item.name} on menu`} type="checkbox" className={checkboxClass} disabled={disabled} checked={item.is_visible} onChange={event => save({ operation: "itemVisibility", payload: { id: item.id, visible: event.target.checked } })} />Show on menu</label>
            <button disabled={disabled} draggable={!disabled} onDragStart={event => dragEntry(event, "item", item.id, category.id)} aria-label={`Drag to reorder ${item.name}; use adjacent arrows on touch screens`} className={`${iconClass} cursor-grab`}>↕</button>
            <button disabled={disabled || itemIndex === 0} onClick={() => reorder("item", category.items, itemIndex, -1, category.id)} aria-label={`Move ${item.name} up`} className={iconClass}>↑</button>
            <button disabled={disabled || itemIndex === category.items.length - 1} onClick={() => reorder("item", category.items, itemIndex, 1, category.id)} aria-label={`Move ${item.name} down`} className={iconClass}>↓</button>
            <button disabled={disabled} onClick={sectionAction(() => setEditing({ kind: "item", categoryId: category.id, item }))} className={secondaryClass}>Edit item</button>
            <button disabled={disabled} onClick={() => setDeleting({ kind: "item", id: item.id, name: item.name })} className={secondaryClass}>Remove</button>
          </div>
          <details className="mt-3"><summary className="cursor-pointer py-2 text-sm font-medium text-ink-muted hover:text-ink">Item photo</summary><div className="mt-2">{image("item", item.image_public_id, item.image_version, item.id)}</div></details>
        </li>)}</ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={disabled} onClick={sectionAction(() => setEditing({ kind: "item", categoryId: category.id }))} className={secondaryClass}>+ Add item</button>
          {!category.parent_id && <button disabled={disabled} onClick={sectionAction(() => setEditing({ kind: "category", parentId: category.id }))} className={secondaryClass}>+ Add subcategory</button>}
        </div>
      </section>; })}
    </>}
    <button disabled={isValidating || pending} onClick={() => void refresh()} className="py-3 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50">{isValidating ? "Refreshing…" : "Refresh menu"}</button>
  </div>;
}
