"use client";
import { useDeferredValue, useMemo, useState } from "react";
import type { PublishedMenu } from "@/lib/menu/schema";
import { filterMenu, indexMenu, itemAvailable } from "@/lib/menu/filter";

export function usePublicMenu(categories: PublishedMenu["categories"]) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState("all");
  const deferredQuery = useDeferredValue(query);
  const index = useMemo(() => indexMenu(categories), [categories]);
  const filtered = useMemo(() => filterMenu(index, deferredQuery, selection), [index, deferredQuery, selection]);
  const specials = useMemo(() => categories.flatMap(category => category.items.filter(item => item.isFeatured && itemAvailable(item))
    .map(item => ({ item, categoryName: category.name }))).slice(0, 6), [categories]);
  return { query, setQuery, selection, setSelection, filtered, specials, searching: query !== deferredQuery };
}
