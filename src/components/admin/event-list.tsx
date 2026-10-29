import Link from "next/link";
import type { AdminEvent } from "@/lib/admin/schemas";
import { eventLabel, formatDateTime } from "@/lib/admin/format";

export function EventList({ events, showRestaurant = true }: { events: AdminEvent[]; showRestaurant?: boolean }) {
  if (!events.length) return <p className="px-5 py-10 text-center text-sm text-ink-muted">No activity yet.</p>;
  return <ol className="divide-y divide-line">
    {events.map(event => {
      const email = typeof event.metadata.email === "string" ? event.metadata.email : null;
      return <li key={event.id} className="px-5 py-3.5">
        <p className="text-sm font-medium">{eventLabel(event.action)}
          {showRestaurant && event.restaurantId && <> · <Link href={`/admin/restaurants/${event.restaurantId}`} className="text-brand hover:underline">{event.restaurantName ?? "Restaurant"}</Link></>}
          {email && <> · <span className="text-ink-muted">{email}</span></>}
        </p>
        <p className="mt-0.5 text-xs text-ink-subtle"><time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>{event.actorEmail && ` · by ${event.actorEmail}`}</p>
      </li>;
    })}
  </ol>;
}
