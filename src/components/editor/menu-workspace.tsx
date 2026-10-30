"use client";
import { useCallback, useMemo, useState } from "react";
import type { EditorCategory } from "@/lib/editor/data";
import type { EditorMutation, MutationResult } from "@/lib/editor/schemas";
import { useMenuEditorView } from "@/hooks/use-menu-editor-view";
import { useMenuReorder } from "@/hooks/use-menu-reorder";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { dangerClass, secondaryClass } from "@/components/ui/form";
import { CategoryForm } from "./category-form";
import { ItemForm } from "./item-form";
import { ImageUploader } from "./image-uploader";
import { CategorySection } from "./category-section";
import { MenuToolbar } from "./menu-toolbar";
import type { MenuEditorActions } from "./menu-actions";
import type { VatRule } from "@/lib/menu/vat";

type DialogState =
  | { kind: "category"; categoryId?: string; parentId?: string }
  | { kind: "item"; categoryId: string; itemId?: string }
  | { kind: "photo"; itemId: string }
  | { kind: "remove"; target: "category" | "item"; id: string; name: string }
  | null;

const textButton = "min-h-11 rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink";

function findItem(categories: EditorCategory[], id: string) {
  return categories.flatMap(category => category.items).find(item => item.id === id);
}

export function MenuWorkspace({ restaurantId, categories, vat, canEdit, pending, result, save, clearResult, refresh }: {
  restaurantId: string; categories: EditorCategory[]; vat: VatRule; canEdit: boolean; pending: boolean; result: MutationResult;
  save: (input: EditorMutation, onSuccess?: () => void) => void; clearResult: () => void; refresh: () => Promise<unknown>;
}) {
  const view = useMenuEditorView(restaurantId, categories);
  const { reveal, revealNextCreated, expand } = view;
  const disabled = pending || !canEdit;
  const reorder = useMenuReorder(categories, save, disabled);
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = useCallback(() => setDialog(null), []);
  const openDialog = useCallback((next: DialogState) => { clearResult(); setDialog(next); }, [clearResult]);

  const actions = useMemo<MenuEditorActions>(() => ({
    disabled, reorderable: !view.searching, ...reorder,
    editCategory: category => openDialog({ kind: "category", categoryId: category.id }),
    addItem: categoryId => openDialog({ kind: "item", categoryId }),
    addSubcategory: parentId => openDialog({ kind: "category", parentId }),
    editItem: item => openDialog({ kind: "item", categoryId: item.category_id, itemId: item.id }),
    itemPhoto: item => openDialog({ kind: "photo", itemId: item.id }),
    remove: (target, id, name) => openDialog({ kind: "remove", target, id, name }),
    setAvailable: item => save({ operation: "availability", payload: { id: item.id, available: !item.is_available } }),
    setVisible: item => save({ operation: "itemVisibility", payload: { id: item.id, visible: !item.is_visible } }),
  }), [disabled, view.searching, reorder, openDialog, save]);

  const editingCategory = dialog?.kind === "category" && dialog.categoryId ? categories.find(category => category.id === dialog.categoryId) : undefined;
  const itemId = dialog?.kind === "item" || dialog?.kind === "photo" ? dialog.itemId : undefined;
  const editingItem = itemId ? findItem(categories, itemId) : undefined;

  return <>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-2xl font-semibold tracking-tight">Your menu</h2><p className="mt-1 text-sm text-ink-subtle">{view.tree.length} {view.tree.length === 1 ? "category" : "categories"} · tap a category to open it</p></div>
      <div className="flex flex-wrap items-center gap-1">
        {categories.length > 0 && <><button type="button" onClick={view.expandAll} className={textButton}>Expand all</button><button type="button" onClick={view.collapseAll} className={textButton}>Collapse all</button></>}
        <button type="button" disabled={disabled} onClick={() => openDialog({ kind: "category" })} className={secondaryClass}>+ Add category</button>
      </div>
    </div>
    {categories.length > 0 && <MenuToolbar query={view.query} onQuery={view.setQuery} view={view.view} onView={view.setView} tree={view.tree} onJump={reveal} />}
    {!categories.length && <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center"><h3 className="text-lg font-semibold">Start with a category.</h3><p className="mt-2 text-sm leading-6 text-ink-muted">Try Momo, Snacks, or Tea & Coffee. Then add your first item and price.</p></div>}
    {view.searching && <p role="status" className="text-sm text-ink-muted">{view.matchCount} {view.matchCount === 1 ? "item" : "items"} in {view.visibleTree.length} {view.visibleTree.length === 1 ? "category" : "categories"} match “{view.query.trim()}”. Reordering is paused while searching.</p>}
    {view.searching && !view.visibleTree.length && <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center"><h3 className="text-lg font-semibold">Nothing matches your search.</h3><button type="button" onClick={() => view.setQuery("")} className={`${secondaryClass} mt-4`}>Clear search</button></div>}
    <div className="space-y-4">
      {view.visibleTree.map(node => <CategorySection key={node.id} category={node} subcategories={node.children} siblings={view.tree} parentVisible view={view.view} vat={vat} actions={actions} isExpanded={view.isExpanded} toggle={view.toggle} />)}
    </div>

    {dialog?.kind === "category" && <Dialog title={editingCategory ? (editingCategory.parent_id ? "Edit subcategory" : "Edit category") : dialog.parentId ? "Add a subcategory" : "Add a category"}
      description={dialog.parentId ? `Inside ${categories.find(category => category.id === dialog.parentId)?.name ?? "this category"}` : undefined} onClose={close}>
      <CategoryForm category={editingCategory} categories={categories} parentId={dialog.parentId} pending={pending} error={result.error} onCancel={close}
        onSave={payload => save({ operation: "saveCategory", payload }, () => { if (!payload.id) revealNextCreated(); close(); })} />
    </Dialog>}
    {dialog?.kind === "item" && <Dialog title={editingItem ? "Edit item" : "Add an item"} description={editingItem?.name} size="lg" onClose={close}>
      <ItemForm item={editingItem} categoryId={dialog.categoryId} categories={categories} vat={vat} pending={pending} error={result.error} onCancel={close}
        onSave={payload => save({ operation: "saveItem", payload }, () => { expand(payload.category_id); close(); })} />
    </Dialog>}
    {dialog?.kind === "photo" && editingItem && <Dialog title="Item photo" description={editingItem.name} onClose={close}>
      <ImageUploader restaurantId={restaurantId} kind="item" itemId={editingItem.id} publicId={editingItem.image_public_id} version={editingItem.image_version}
        disabled={disabled} onSaved={refresh} onRemove={() => save({ operation: "removeImage", payload: { kind: "item", item_id: editingItem.id } })} />
    </Dialog>}
    {dialog?.kind === "remove" && <Dialog title={`Remove ${dialog.target}?`} size="sm" onClose={close}>
      <p className="break-words text-sm leading-6 text-ink-muted">“{dialog.name}” will be removed from your menu.</p>
      {result.error && <p role="alert" className="mt-3 text-sm text-danger">{result.error}</p>}
      <DialogFooter>
        <button type="button" disabled={disabled} onClick={() => save({ operation: "delete", payload: { kind: dialog.target, id: dialog.id } }, close)} className={dangerClass}>{pending ? "Removing…" : `Remove ${dialog.target}`}</button>
        <button type="button" onClick={close} className={secondaryClass}>Cancel</button>
      </DialogFooter>
    </Dialog>}
  </>;
}
