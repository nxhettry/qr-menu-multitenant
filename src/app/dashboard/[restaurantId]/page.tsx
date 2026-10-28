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
import { AppHeader } from "@/components/ui/brand";
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
  return <main className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
    <AppHeader logoHref="/dashboard"><Link href="/dashboard" className="hidden rounded-full px-3 py-2 font-medium min-[380px]:inline-flex text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">Your restaurants</Link><form action={logout}><button className="rounded-full px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">Sign out</button></form></AppHeader>
    {restaurants.length > 1 && <nav aria-label="Switch restaurant" className="mt-5 flex gap-2 overflow-x-auto pb-2">{restaurants.map(restaurant => <Link key={restaurant.id} href={`/dashboard/${restaurant.id}`} aria-current={restaurant.id === restaurantId ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${restaurant.id === restaurantId ? "border-ink bg-ink text-canvas" : "border-line-strong text-ink-muted hover:text-ink"}`}>{restaurant.name}</Link>)}</nav>}
    <SWRProvider key={user.id}><MenuEditor key={`${user.id}:${restaurantId}`} userId={user.id} restaurantId={restaurantId} initialData={initialData} canEdit={can(context, "menu:edit")} canManage={can(context, "restaurant:manage")} /></SWRProvider>
  </main>;
}

export default function EditorPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  return <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-ink-muted">Loading your restaurant…</p>}><EditorContent params={params} /></Suspense>;
}
