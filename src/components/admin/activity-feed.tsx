"use client";
import { useAdminEvents } from "@/hooks/use-admin-events";
import { cardClass, secondaryClass } from "@/components/ui/form";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { EventList } from "./event-list";
import { ListError } from "./list-controls";

export function ActivityFeed({ userId, restaurantId }: { userId: string; restaurantId?: string }) {
  const { events, error, isLoading, loadingMore, hasMore, loadMore, refresh } = useAdminEvents(userId, restaurantId);
  if (error) return <ListError onRetry={() => void refresh()} />;
  return <section aria-label="Activity" aria-busy={isLoading} className="mt-8">
    <div className={`${cardClass} overflow-hidden`}>
      {isLoading ? <ListSkeleton rows={4} label="Loading activity" search={false} /> : <EventList events={events} showRestaurant={!restaurantId} />}
    </div>
    {hasMore && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className={`${secondaryClass} mt-5 w-full sm:w-auto`}>{loadingMore ? "Loading…" : "Load older activity"}</button>}
  </section>;
}
