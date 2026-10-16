import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { RestaurantForm } from "@/components/restaurant-form";
import { logout } from "@/app/auth/actions";

async function OnboardingContent() {
  await requireUser();
  return <main className="mx-auto w-full max-w-lg px-6 py-14">
    <Link href="/" className="font-bold">qrmenu.</Link>
    <p className="mt-12 text-xs font-semibold uppercase tracking-widest text-orange-800">Make it yours</p>
    <h1 className="mt-4 font-serif text-4xl">Welcome your restaurant.</h1>
    <p className="mt-4 leading-7 text-stone-600">Start with a name and an address. Your restaurant stays private until its menu is ready to publish.</p>
    <RestaurantForm />
    <div className="mt-7 flex justify-between text-sm text-stone-600"><Link href="/dashboard">Back to dashboard</Link><form action={logout}><button>Sign out</button></form></div>
  </main>;
}
export default function OnboardingPage() {
  return <Suspense fallback={<p className="p-10">Loading restaurant setup…</p>}><OnboardingContent /></Suspense>;
}
