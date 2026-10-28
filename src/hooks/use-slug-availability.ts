"use client";
import useSWR from "swr";
import { isRestaurantSlug } from "@/lib/menu/slugs";
import { useDebouncedValue } from "./use-debounced-value";

export type SlugStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

export function useSlugAvailability(slug: string, delayMs = 400): SlugStatus {
  const debounced = useDebouncedValue(slug, delayMs);
  const key = isRestaurantSlug(debounced) ? `/api/dashboard/slug-availability?slug=${encodeURIComponent(debounced)}` : null;
  const { data, error, isLoading } = useSWR<{ available: boolean }>(key, { revalidateOnFocus: false, dedupingInterval: 10_000 });
  if (!slug) return "idle";
  if (!isRestaurantSlug(slug)) return "invalid";
  if (slug !== debounced || isLoading) return "checking";
  if (error) return "error";
  return data?.available ? "available" : "taken";
}
