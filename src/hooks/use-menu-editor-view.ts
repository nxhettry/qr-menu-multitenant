"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorCategory } from "@/lib/editor/data";
import { categoryTree, countTreeItems, filterCategoryTree } from "@/lib/editor/categories";
import { useDebouncedValue } from "./use-debounced-value";
import { usePersistedState } from "./use-persisted-state";

export type MenuViewMode = "list" | "grid";

const noIds: string[] = [];
const isViewMode = (value: unknown): value is MenuViewMode => value === "list" || value === "grid";
const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every(entry => typeof entry === "string");
export const categoryAnchor = (id: string) => `category-${id}`;

export function useMenuEditorView(restaurantId: string, categories: EditorCategory[]) {
  const [view, setView] = usePersistedState<MenuViewMode>("qrmenu:editor-view", "list", isViewMode);
  const [expandedIds, setExpandedIds] = usePersistedState(`qrmenu:editor-expanded:${restaurantId}`, noIds, isIdList);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const searching = !!debouncedQuery.trim();
  const tree = useMemo(() => categoryTree(categories), [categories]);
  const visibleTree = useMemo(() => filterCategoryTree(tree, debouncedQuery), [tree, debouncedQuery]);
  const matchCount = useMemo(() => countTreeItems(visibleTree), [visibleTree]);
  const expanded = useMemo(() => new Set(expandedIds), [expandedIds]);

  const isExpanded = useCallback((id: string) => searching || expanded.has(id), [searching, expanded]);
  const toggle = useCallback((id: string) => setExpandedIds(ids => ids.includes(id) ? ids.filter(entry => entry !== id) : [...ids, id]), [setExpandedIds]);
  const expandAll = useCallback(() => setExpandedIds(categories.map(category => category.id)), [categories, setExpandedIds]);
  const collapseAll = useCallback(() => setExpandedIds(noIds), [setExpandedIds]);
  const expand = useCallback((id: string) => {
    const parentId = categories.find(category => category.id === id)?.parent_id;
    setExpandedIds(ids => [...new Set([...ids, id, ...(parentId ? [parentId] : [])])]);
  }, [categories, setExpandedIds]);
  const reveal = useCallback((id: string) => {
    expand(id);
    requestAnimationFrame(() => document.getElementById(categoryAnchor(id))?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [expand]);

  const knownIds = useRef<Set<string>>(null);
  const revealPending = useRef(false);
  const revealNextCreated = useCallback(() => { revealPending.current = true; }, []);
  useEffect(() => {
    const previous = knownIds.current;
    knownIds.current = new Set(categories.map(category => category.id));
    if (!revealPending.current || !previous) return;
    const created = categories.find(category => !previous.has(category.id));
    if (!created) return;
    revealPending.current = false;
    reveal(created.id);
  }, [categories, reveal]);

  return { view, setView, query, setQuery, searching, tree, visibleTree, matchCount, isExpanded, toggle, expand, expandAll, collapseAll, reveal, revealNextCreated };
}
