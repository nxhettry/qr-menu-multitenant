"use client";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { PublishedMenu } from "@/lib/menu/schema";
import { filterMenu, indexMenu, itemAvailable } from "@/lib/menu/filter";

export function usePublicMenu(categories: PublishedMenu["categories"]) {
  const [query, setQuery] = useState("");
  const [selection, updateSelection] = useState("all");
  const [subcategory, setSubcategory] = useState("");
  const setSelection = useCallback((value: string) => { updateSelection(value); setSubcategory(""); }, []);
  const deferredQuery = useDeferredValue(query);
  const index = useMemo(() => indexMenu(categories), [categories]);
  const filtered = useMemo(() => filterMenu(index, deferredQuery, selection, subcategory), [index, deferredQuery, selection, subcategory]);
  const subcategories = useMemo(() => [...new Set(categories.filter(category => selection === "all" || selection === "specials" || category.id === selection).flatMap(category => category.items.map(item => item.subcategory).filter((value): value is string => !!value)))], [categories, selection]);
  const specials = useMemo(() => categories.flatMap(category => category.items.filter(item => item.isFeatured && itemAvailable(item))
    .map(item => ({ item, categoryName: category.name }))).slice(0, 6), [categories]);
  return { query, setQuery, selection, setSelection, subcategory, setSubcategory, subcategories, filtered, specials, searching: query !== deferredQuery };
}
