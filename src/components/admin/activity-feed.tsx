"use client";
import { useAdminEvents } from "@/hooks/use-admin-events";
import { cardClass, secondaryClass } from "@/components/ui/form";
import { EventList } from "./event-list";
import { ListError } from "./list-controls";

export function ActivityFeed({ userId, restaurantId }: { userId: string; restaurantId?: string }) {
  const { events, error, isLoading, loadingMore, hasMore, loadMore, refresh } = useAdminEvents(userId, restaurantId);
  if (error) return <ListError onRetry={() => void refresh()} />;
  return <section aria-label="Activity" aria-busy={isLoading} className="mt-8">
    <div className={`${cardClass} overflow-hidden`}>
      {isLoading ? <p role="status" className="px-5 py-10 text-center text-sm text-ink-muted">Loading activity…</p> : <EventList events={events} showRestaurant={!restaurantId} />}
    </div>
    {hasMore && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className={`${secondaryClass} mt-5 w-full sm:w-auto`}>{loadingMore ? "Loading…" : "Load older activity"}</button>}
  </section>;
}
