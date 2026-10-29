import type { EditorCategory, EditorItem } from "./data";
import { searchableText } from "../menu/filter.ts";

export type CategoryNode = EditorCategory & { children: EditorCategory[] };

export function categoryLabel(category: EditorCategory, categories: EditorCategory[]) {
  const parent = categories.find(entry => entry.id === category.parent_id);
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

export function orderedCategories(categories: EditorCategory[]) {
  return categories.filter(category => !category.parent_id).flatMap(parent => [parent, ...categories.filter(category => category.parent_id === parent.id)]);
}

export function categoryTree(categories: EditorCategory[]): CategoryNode[] {
  return categories.filter(category => !category.parent_id).map(parent => ({ ...parent, children: categories.filter(category => category.parent_id === parent.id) }));
}

function matcher(query: string) {
  const tokens = searchableText(query).split(" ").filter(Boolean);
  return (...values: (string | null)[]) => {
    const text = searchableText(values.filter(Boolean).join(" "));
    return tokens.every(token => text.includes(token));
  };
}

function filterItems(items: EditorItem[], matches: ReturnType<typeof matcher>) {
  return items.filter(item => matches(item.name, item.name_ne, ...item.variants.flatMap(variant => [variant.name, variant.name_ne])));
}

export function filterCategoryTree(tree: CategoryNode[], query: string): CategoryNode[] {
  if (!query.trim()) return tree;
  const matches = matcher(query);
  return tree.flatMap(parent => {
    if (matches(parent.name, parent.name_ne)) return [parent];
    const children = parent.children.flatMap(child => {
      if (matches(child.name, child.name_ne)) return [child];
      const items = filterItems(child.items, matches);
      return items.length ? [{ ...child, items }] : [];
    });
    const items = filterItems(parent.items, matches);
    return items.length || children.length ? [{ ...parent, items, children }] : [];
  });
}

export function countTreeItems(tree: CategoryNode[]) {
  return tree.reduce((total, parent) => total + parent.items.length + parent.children.reduce((sum, child) => sum + child.items.length, 0), 0);
}
