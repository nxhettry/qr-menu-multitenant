"use client";
import useSWR from "swr";
import type { PhotoOptions } from "@/lib/media/schemas";

/** Photos an item can use. Fetched only while the picker is open and refreshed after each change. */
export function usePhotoOptions(userId: string, restaurantId: string, itemId: string, enabled: boolean) {
  return useSWR<PhotoOptions>(
    enabled ? [`/api/dashboard/restaurants/${restaurantId}/photos?itemId=${itemId}`, userId, restaurantId] : null,
    { revalidateOnFocus: false, dedupingInterval: 10_000 },
  );
}
