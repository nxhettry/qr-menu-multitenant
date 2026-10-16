import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can, getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { listRestaurantsForUser } from "@/lib/tenancy/restaurants";
import { getEditorData } from "@/lib/editor/repository";
import { SWRProvider } from "@/components/swr-provider";
import { MenuEditor } from "@/components/editor/menu-editor";
import { logout } from "@/app/auth/actions";

export const metadata = { title: "Manage menu — QR Menu", robots: { index: false, follow: false } };

async function EditorContent({ params }: { params: Promise<{ restaurantId: string }> }) {
  await connection();
  const user = await requireUser();
  const { restaurantId } = await params;
  let context;
  try { context = await getTenantContext(restaurantId); }
  catch (error) { if (error instanceof TenantAccessError && error.status === 404) notFound(); throw error; }
  const [initialData, restaurants] = await Promise.all([getEditorData(context), listRestaurantsForUser(user.id)]);
  return <main className="mx-auto w-full max-w-4xl px-5 pb-16 pt-7 sm:px-8">
    <header className="flex items-center justify-between border-b border-stone-200 pb-5"><Link href="/dashboard" className="font-bold">← Your restaurants</Link><form action={logout}><button className="px-3 py-2 text-sm text-stone-600">Sign out</button></form></header>
    {restaurants.length > 1 && <nav aria-label="Switch restaurant" className="mt-5 flex gap-2 overflow-x-auto pb-2">{restaurants.map(restaurant => <Link key={restaurant.id} href={`/dashboard/${restaurant.id}`} aria-current={restaurant.id === restaurantId ? "page" : undefined} className={`shrink-0 rounded-full border px-4 py-3 text-sm ${restaurant.id === restaurantId ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}>{restaurant.name}</Link>)}</nav>}
    <SWRProvider key={user.id}><MenuEditor key={`${user.id}:${restaurantId}`} userId={user.id} restaurantId={restaurantId} initialData={initialData} canEdit={can(context, "menu:edit")} canManage={can(context, "restaurant:manage")} /></SWRProvider>
  </main>;
}

export default function EditorPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  return <Suspense fallback={<p role="status" className="p-10 text-center">Loading your restaurant…</p>}><EditorContent params={params} /></Suspense>;
}
