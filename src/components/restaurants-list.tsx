"use client";
import useSWR from "swr";
import Link from "next/link";
import type { RestaurantSummary } from "@/lib/tenancy/restaurants";
import { cardClass, darkClass, linkClass, noticeClass } from "./ui/form";
import { StatusBadge } from "./ui/status-badge";

export function RestaurantsList({ userId, initialData }: { userId: string; initialData: RestaurantSummary[] }) {
  const { data, error, isValidating, mutate } = useSWR<{ restaurants: RestaurantSummary[] }>(
    ["/api/dashboard/restaurants", userId], { fallbackData: { restaurants: initialData } },
  );
  // Never retain private fallback data after a session/access error.
  if (error) return <div role="alert" className={`${noticeClass("danger")} mt-8`}>We couldn’t refresh your restaurants. Sign in again or <button className="font-semibold underline" onClick={() => void mutate()}>try again</button>.</div>;
  return <div className="mt-8">
    <div className="grid gap-4 sm:grid-cols-2">{data?.restaurants.map(restaurant => {
      const live = restaurant.status === "PUBLISHED";
      return <article key={restaurant.id} className={`${cardClass} flex flex-col p-6`}>
        <StatusBadge tone={restaurant.status} />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{restaurant.name}</h2>
        <p className="mt-1 text-sm text-ink-subtle">/{restaurant.slug}</p>
        <p className="mt-4 flex-1 text-sm leading-6 text-ink-muted">{live ? "Your menu is live. Saved edits appear for guests immediately." : "Add your categories and items, preview your menu, then publish when you’re ready."}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={`/dashboard/${restaurant.id}`} className={darkClass}>Manage menu →</Link>
          <Link href={`/${restaurant.slug}`} target="_blank" rel="noopener noreferrer" className={`${linkClass} text-sm`}>Open public menu ↗</Link>
        </div>
      </article>;
    })}</div>
    <button onClick={() => void mutate()} disabled={isValidating} className="mt-6 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50">{isValidating ? "Refreshing…" : "Refresh restaurants"}</button>
  </div>;
}
