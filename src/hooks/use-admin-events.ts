"use client";
import useSWRInfinite from "swr/infinite";
import { ADMIN_EVENTS_LIMIT, type AdminEvent } from "@/lib/admin/schemas";

/** Keyset-paginated audit feed: each page asks only for events older than the last one shown. */
export function useAdminEvents(userId: string, restaurantId?: string) {
  const { data, error, size, setSize, isValidating, isLoading, mutate } = useSWRInfinite<AdminEvent[]>((index, previous: AdminEvent[] | null) => {
    if (previous && previous.length < ADMIN_EVENTS_LIMIT) return null;
    const params = new URLSearchParams();
    if (restaurantId) params.set("restaurantId", restaurantId);
    const last = previous?.at(-1);
    if (index > 0 && last) { params.set("beforeAt", last.createdAt); params.set("beforeId", last.id); }
    return [`/api/admin/events?${params}`, userId];
  }, { revalidateOnFocus: false, revalidateFirstPage: false });
  const events = data?.flat() ?? [];
  const hasMore = Boolean(data && data.at(-1)?.length === ADMIN_EVENTS_LIMIT);
  return { events, error, isLoading, loadingMore: isValidating && size > (data?.length ?? 0), hasMore, loadMore: () => setSize(size + 1), refresh: mutate };
}
