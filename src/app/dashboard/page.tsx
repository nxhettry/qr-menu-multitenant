import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listRestaurantsForUser } from "@/lib/tenancy/restaurants";
import { SWRProvider } from "@/components/swr-provider";
import { RestaurantsList } from "@/components/restaurants-list";
import { AppHeader, PageTitle } from "@/components/ui/brand";
import { StatusScreen } from "@/components/ui/status-screen";
import { primaryClass } from "@/components/ui/form";
import { logout } from "@/app/auth/actions";

const signOut = <form action={logout}><button className="rounded-full px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">Sign out</button></form>;

async function DashboardContent() {
  const user = await requireUser();
  let restaurants;
  try { restaurants = await listRestaurantsForUser(user.id); }
  catch {
    return <StatusScreen title="Your dashboard is taking a moment." body="We couldn’t load your restaurants. Please try again shortly." action={<div className="flex items-center gap-3"><Link href="/dashboard" className={primaryClass}>Try again</Link>{signOut}</div>} />;
  }
  return <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
    <AppHeader>{signOut}</AppHeader>
    <div className="mt-10 flex flex-wrap items-end justify-between gap-5">
      <PageTitle eyebrow="Your workspace" title="Your restaurants."><p className="text-sm">Signed in as {user.email}</p></PageTitle>
      <Link href="/onboarding" className={primaryClass}>Add a restaurant →</Link>
    </div>
    {restaurants.length ? <SWRProvider key={user.id}><RestaurantsList userId={user.id} initialData={restaurants} /></SWRProvider> : <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center"><p className="font-semibold">No restaurants yet</p><p className="mt-2 text-sm leading-6 text-ink-muted">Add your first restaurant to get started.</p></div>}
  </main>;
}
export default function DashboardPage() {
  return <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-ink-muted">Loading your workspace…</p>}><DashboardContent /></Suspense>;
}
