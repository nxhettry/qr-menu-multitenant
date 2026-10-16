import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listRestaurantsForUser } from "@/lib/tenancy/restaurants";
import { SWRProvider } from "@/components/swr-provider";
import { RestaurantsList } from "@/components/restaurants-list";
import { logout } from "@/app/auth/actions";

async function DashboardContent() {
  const user = await requireUser();
  let restaurants;
  try { restaurants = await listRestaurantsForUser(user.id); }
  catch {
    return <main className="mx-auto w-full max-w-xl px-6 py-16"><h1 className="font-serif text-3xl">Your dashboard is taking a moment.</h1><p className="mt-4 text-stone-600">We couldn’t load your restaurants. Please try again shortly.</p><Link href="/dashboard" className="mt-6 inline-block underline">Try again</Link><form action={logout} className="mt-5"><button>Sign out</button></form></main>;
  }
  return <main className="mx-auto w-full max-w-4xl px-6 py-12">
    <header className="flex items-center justify-between border-b border-stone-200 pb-6"><Link href="/" className="font-bold">qrmenu.</Link><form action={logout}><button className="text-sm text-stone-600">Sign out</button></form></header>
    <p className="mt-12 text-xs font-semibold uppercase tracking-widest text-orange-800">Your workspace</p>
    <h1 className="mt-4 font-serif text-4xl">Your restaurants.</h1>
    <p className="mt-4 text-sm text-stone-600">Signed in as {user.email}</p>
    {restaurants.length ? <SWRProvider key={user.id}><RestaurantsList userId={user.id} initialData={restaurants} /></SWRProvider> : <p className="mt-8 leading-7 text-stone-600">Add your first restaurant to get started.</p>}
    <Link href="/onboarding" className="mt-8 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">Add a restaurant →</Link>
  </main>;
}
export default function DashboardPage() {
  return <Suspense fallback={<p className="p-10">Loading your workspace…</p>}><DashboardContent /></Suspense>;
}
