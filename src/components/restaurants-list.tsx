"use client";
import useSWR from "swr";
import Link from "next/link";
import type { RestaurantSummary } from "@/lib/tenancy/restaurants";

export function RestaurantsList({ userId, initialData }: { userId: string; initialData: RestaurantSummary[] }) {
  const { data, error, isValidating, mutate } = useSWR<{ restaurants: RestaurantSummary[] }>(
    ["/api/dashboard/restaurants", userId], { fallbackData: { restaurants: initialData } },
  );
  // Never retain private fallback data after a session/access error.
  if (error) return <div role="alert" className="mt-8 rounded-xl border border-red-200 p-5 text-sm text-red-800">We couldn’t refresh your restaurants. Sign in again or <button className="underline" onClick={() => void mutate()}>try again</button>.</div>;
  return <div className="mt-8">
    <div className="grid gap-4 sm:grid-cols-2">{data?.restaurants.map(restaurant => <article key={restaurant.id} className="rounded-2xl border border-stone-200 bg-white p-6">
      <span className="text-xs font-semibold uppercase tracking-widest text-orange-800">{restaurant.status}</span>
      <h2 className="mt-4 text-xl font-semibold">{restaurant.name}</h2>
      <p className="mt-2 text-sm text-stone-500">/{restaurant.slug}</p>
      <p className="mt-5 text-sm leading-6 text-stone-600">{restaurant.status === "PUBLISHED" ? "Your menu is live. Saved edits appear for guests immediately." : "Add your categories and items, preview your menu, then publish when you’re ready."}</p>
      <Link href={`/dashboard/${restaurant.id}`} className="mt-5 mr-5 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Manage menu →</Link>
      <Link href={`/${restaurant.slug}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-orange-800 underline underline-offset-4">Open public menu ↗</Link>
    </article>)}</div>
    <button onClick={() => void mutate()} disabled={isValidating} className="mt-6 text-sm font-medium text-stone-600 disabled:opacity-50">{isValidating ? "Refreshing…" : "Refresh restaurants"}</button>
  </div>;
}
