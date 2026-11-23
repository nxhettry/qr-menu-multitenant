"use client";
import useSWR from "swr";
import type { DishPhoto } from "@/lib/admin/schemas";

export function useDishPhotos(userId: string, dishId: string) {
  return useSWR<DishPhoto[]>([`/api/admin/dishes/${dishId}/photos`, userId], { revalidateOnFocus: false });
}
