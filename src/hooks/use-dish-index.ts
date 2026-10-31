"use client";
import { useMemo } from "react";
import useSWR from "swr";
import { dishCatalogSchema } from "@/lib/dishes/schemas";
import { buildDishIndex, suggestDishes, type DishIndex } from "@/lib/dishes/search";
import { useDebouncedValue } from "./use-debounced-value";

const ONE_HOUR = 3_600_000;
export const SUGGESTION_DELAY_MS = 150;

/** The shared dish catalog, fetched once per session and indexed once per load. Null until it arrives or if it cannot be read. */
export function useDishIndex(userId: string): DishIndex | null {
  const { data } = useSWR<unknown>(["/api/dashboard/dishes", userId], {
    dedupingInterval: ONE_HOUR, revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false, shouldRetryOnError: false,
  });
  return useMemo(() => {
    const parsed = dishCatalogSchema.safeParse(data);
    return parsed.success ? buildDishIndex(parsed.data) : null;
  }, [data]);
}

export function useDishSuggestions(index: DishIndex | null, text: string) {
  const query = useDebouncedValue(text, SUGGESTION_DELAY_MS);
  return useMemo(() => index ? suggestDishes(index, query) : [], [index, query]);
}
