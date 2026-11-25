import type { EditorCategory, EditorItem } from "../editor/data.ts";
import { itemDetailsSchema, type ItemDetails } from "../menu/details.ts";
import {
  ADDON_GROUP_NAME, sameValue, syncedFields, syncedItem,
  type CategoryBase, type ItemBase, type MenuSnapshot, type SyncedField, type SyncedItem,
} from "./snapshot.ts";

/**
 * Turns a RestroFuel snapshot into menu changes. Three-way: a field is
 * overwritten only when RestroFuel changed it since the last applied sync
 * (`external_base`), so the owner's own edits survive. Items removed in
 * RestroFuel are hidden; items the owner deleted are never re-created.
 */

export type RefRow<Base> = { id: string; ref: string; base: Base | null; deleted: boolean };
export type MenuState = { categories: RefRow<CategoryBase>[]; items: RefRow<ItemBase>[] };
export type SyncMode = "merge" | "replace";

export type SyncSummary = {
  added: { ref: string; name: string; price_minor: number; category: string }[];
  changed: { ref: string; name: string; fields: { field: SyncedField; from: unknown; to: unknown }[] }[];
  removed: { ref: string; name: string }[];
  restored: { ref: string; name: string }[];
  renamedCategories: { from: string; to: string }[];
};

type CategoryPayload = { id?: string; parent_id: string | null; name: string; name_ne: string | null; is_visible: boolean };
type ItemPayload = Record<string, unknown>;
export type PlanOp =
  | { op: "delete"; payload: { kind: "category" | "item"; id: string } }
  | { op: "category"; ref: string; base: CategoryBase; payload: CategoryPayload }
  | { op: "item"; ref: string; base: ItemBase; categoryRef?: string; payload: ItemPayload }
  | { op: "visibility"; base: ItemBase; payload: { id: string; visible: boolean } }
  | { op: "base"; kind: "category" | "item"; id: string; ref: string; base: CategoryBase | ItemBase }
  | { op: "publish" };

const nameKey = (value: string) => value.normalize("NFKC").trim().toLowerCase();

function indexState<Base>(rows: RefRow<Base>[]) {
  const live = new Map(rows.filter(row => !row.deleted).map(row => [row.ref, row]));
  const deleted = new Set(rows.filter(row => row.deleted && !live.has(row.ref)).map(row => row.ref));
  return { live, deleted };
}

export function summarize(snapshot: MenuSnapshot, state: MenuState): SyncSummary {
  const items = indexState(state.items), categories = indexState(state.categories);
  const categoryNames = new Map(snapshot.categories.map(category => [category.ref, category.name]));
  const summary: SyncSummary = { added: [], changed: [], removed: [], restored: [], renamedCategories: [] };
  for (const category of snapshot.categories) {
    const base = categories.live.get(category.ref)?.base;
    if (base && base.name !== category.name) summary.renamedCategories.push({ from: base.name, to: category.name });
  }
  for (const item of snapshot.items) {
    const fields = syncedItem(item), row = items.live.get(item.ref);
    if (items.deleted.has(item.ref) || categories.deleted.has(item.categoryRef)) continue;
    if (!row?.base) {
      if (!row) summary.added.push({ ref: item.ref, name: fields.name, price_minor: fields.price_minor, category: categoryNames.get(item.categoryRef) ?? "" });
      continue;
    }
    if (row.base.removed) summary.restored.push({ ref: item.ref, name: fields.name });
    const changed = syncedFields.filter(field => !sameValue(row.base![field], fields[field]))
      .map(field => ({ field, from: row.base![field], to: fields[field] }));
    if (changed.length) summary.changed.push({ ref: item.ref, name: fields.name, fields: changed });
  }
  const present = new Set(snapshot.items.map(item => item.ref));
  for (const [ref, row] of items.live) {
    if (!present.has(ref) && row.base && !row.base.removed) summary.removed.push({ ref, name: row.base.name });
  }
  return summary;
}

export const isEmptySummary = (summary: SyncSummary) =>
  !summary.added.length && !summary.changed.length && !summary.removed.length && !summary.restored.length && !summary.renamedCategories.length;

function withAddons(details: ItemDetails, addons: SyncedItem["addons"]): ItemDetails | null {
  const others = details.addon_groups.filter(group => group.name !== ADDON_GROUP_NAME);
  if (!addons.length) return { ...details, addon_groups: others };
  if (others.length >= 10) return null;
  const group = { name: ADDON_GROUP_NAME, min_select: 0, max_select: addons.length,
    options: addons.map(addon => ({ ...addon, is_available: true })) };
  return { ...details, addon_groups: [...others, group] };
}

function existingPayload(item: EditorItem): ItemPayload {
  return {
    id: item.id, category_id: item.category_id, name: item.name, name_ne: item.name_ne,
    description: item.description, description_ne: item.description_ne, price_minor: item.price_minor,
    variants: item.variants.map(({ name, name_ne, price_minor, is_available }) => ({ name, name_ne, price_minor, is_available })),
    is_available: item.is_available, is_visible: item.is_visible, details: item.details, is_featured: item.is_featured,
    diet: item.diet, spice_level: item.spice_level, confirm_prices: true,
  };
}

function newPayload(fields: SyncedItem): ItemPayload {
  return {
    name: fields.name, name_ne: null, description: fields.description, description_ne: null,
    price_minor: fields.price_minor, variants: [], is_available: fields.is_available, is_visible: true,
    details: withAddons(itemDetailsSchema.parse({}), fields.addons) ?? itemDetailsSchema.parse({}), diet: fields.diet, spice_level: null, confirm_prices: true,
  };
}

/** Applies the RestroFuel fields in `take` over the item as it is now. */
function mergedPayload(item: EditorItem, fields: SyncedItem, take: Set<SyncedField>, categoryId: string | null, restore: boolean) {
  const payload = existingPayload(item);
  if (take.has("name")) payload.name = fields.name;
  if (take.has("description")) payload.description = fields.description;
  if (take.has("price_minor") && !item.variants.length) payload.price_minor = fields.price_minor;
  if (take.has("diet")) payload.diet = fields.diet;
  if (take.has("is_available")) payload.is_available = fields.is_available;
  if (take.has("categoryRef") && categoryId) payload.category_id = categoryId;
  if (take.has("addons")) payload.details = withAddons(item.details, fields.addons) ?? item.details;
  if (restore) payload.is_visible = true;
  return payload;
}

export type PlanInput = {
  snapshot: MenuSnapshot; state: MenuState; categories: EditorCategory[];
  mode: SyncMode; publish: boolean; published: boolean;
};

export function planSync({ snapshot, state, categories, mode, publish, published }: PlanInput): PlanOp[] {
  const itemState = indexState(state.items), categoryState = indexState(state.categories);
  const items = new Map(categories.flatMap(category => category.items.map(item => [item.id, item] as const)));
  const linkedCategoryIds = new Set([...categoryState.live.values()].map(row => row.id));
  const linkedItemIds = new Set([...itemState.live.values()].map(row => row.id));
  const categoryOps: PlanOp[] = [], itemOps: PlanOp[] = [], hideOps: PlanOp[] = [];

  // Categories: by ref, else an unlinked top-level one with the same name, else created when an item needs it.
  const categoryIds = new Map<string, string>();
  const toCreate = new Map<string, CategoryBase>();
  const neededNew = new Set<string>();
  for (const category of snapshot.categories) {
    const base: CategoryBase = { name: category.name };
    const row = categoryState.live.get(category.ref);
    const current = row && categories.find(entry => entry.id === row.id);
    if (row && current) {
      categoryIds.set(category.ref, row.id);
      if (row.base && row.base.name !== category.name) {
        categoryOps.push({ op: "category", ref: category.ref, base,
          payload: { id: current.id, parent_id: current.parent_id, name: category.name, name_ne: current.name_ne, is_visible: current.is_visible } });
      } else if (!row.base) categoryOps.push({ op: "base", kind: "category", id: row.id, ref: category.ref, base });
      continue;
    }
    if (categoryState.deleted.has(category.ref)) continue;
    const match = categories.find(entry => !entry.parent_id && !linkedCategoryIds.has(entry.id) && nameKey(entry.name) === nameKey(category.name));
    if (match) {
      linkedCategoryIds.add(match.id);
      categoryIds.set(category.ref, match.id);
      categoryOps.push({ op: "base", kind: "category", id: match.id, ref: category.ref, base });
    } else toCreate.set(category.ref, base);
  }
  const placeIn = (categoryRef: string): { category_id: string } | { categoryRef: string } | null => {
    const id = categoryIds.get(categoryRef);
    if (id) return { category_id: id };
    if (!toCreate.has(categoryRef)) return null;
    neededNew.add(categoryRef);
    return { categoryRef };
  };

  for (const entry of snapshot.items) {
    const fields = syncedItem(entry);
    const base: ItemBase = fields;
    if (itemState.deleted.has(entry.ref)) continue;
    const row = itemState.live.get(entry.ref);
    let current = row ? items.get(row.id) : undefined;
    let previous = row?.base ?? null;
    if (!row) {
      const place = placeIn(entry.categoryRef);
      if (!place) continue;
      if ("category_id" in place) {
        const category = categories.find(category => category.id === place.category_id);
        current = category?.items.find(item => !linkedItemIds.has(item.id) && nameKey(item.name) === nameKey(fields.name));
      }
      if (!current) {
        itemOps.push({ op: "item", ref: entry.ref, base, ...("categoryRef" in place ? { categoryRef: place.categoryRef } : {}),
          payload: { ...newPayload(fields), ...("category_id" in place ? { category_id: place.category_id } : {}) } });
        continue;
      }
      linkedItemIds.add(current.id);
      previous = null;
    }
    if (!current) continue;
    const take = new Set(syncedFields.filter(field => !previous || !sameValue(previous[field], fields[field])));
    let categoryId: string | null = null;
    if (take.has("categoryRef")) {
      const place = placeIn(entry.categoryRef);
      if (place && "category_id" in place) categoryId = place.category_id;
      else if (place) {
        // Moving into a category created by this same plan: the database fills in its id.
        const { category_id: _current, ...payload } = mergedPayload(current, fields, take, null, Boolean(previous?.removed));
        void _current;
        itemOps.push({ op: "item", ref: entry.ref, base, categoryRef: place.categoryRef, payload });
        continue;
      }
    }
    const payload = mergedPayload(current, fields, take, categoryId, Boolean(previous?.removed));
    if (!sameValue(payload, existingPayload(current))) itemOps.push({ op: "item", ref: entry.ref, base, payload });
    else if (!row || !sameValue(previous, base)) itemOps.push({ op: "base", kind: "item", id: current.id, ref: entry.ref, base });
  }

  const present = new Set(snapshot.items.map(item => item.ref));
  for (const [ref, row] of itemState.live) {
    if (present.has(ref) || !row.base || row.base.removed) continue;
    const base = { ...row.base, removed: true };
    if (items.get(row.id)?.is_visible) hideOps.push({ op: "visibility", base, payload: { id: row.id, visible: false } });
    else hideOps.push({ op: "base", kind: "item", id: row.id, ref, base });
  }

  const deleteOps: PlanOp[] = [];
  if (mode === "replace") {
    const removedItems = new Set<string>();
    for (const item of items.values()) {
      if (linkedItemIds.has(item.id)) continue;
      removedItems.add(item.id);
      deleteOps.push({ op: "delete", payload: { kind: "item", id: item.id } });
    }
    const removedCategories = new Set<string>();
    const emptied = (category: EditorCategory) => !linkedCategoryIds.has(category.id) && category.items.every(item => removedItems.has(item.id)) &&
      categories.every(child => child.parent_id !== category.id || removedCategories.has(child.id));
    for (const category of [...categories].sort((a, b) => Number(!a.parent_id) - Number(!b.parent_id))) {
      if (!emptied(category)) continue;
      removedCategories.add(category.id);
      deleteOps.push({ op: "delete", payload: { kind: "category", id: category.id } });
    }
  }

  const createOps: PlanOp[] = [...neededNew].map(ref => ({ op: "category", ref, base: toCreate.get(ref)!,
    payload: { parent_id: null, name: toCreate.get(ref)!.name, name_ne: null, is_visible: true } }));
  return [...deleteOps, ...categoryOps, ...createOps, ...itemOps, ...hideOps, ...(publish && !published ? [{ op: "publish" } as const] : [])];
}
