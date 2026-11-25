import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can, getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { getReviewPage } from "@/lib/restrofuel/service";
import { privateMetadata } from "@/lib/seo/site";
import { formatDateTime } from "@/lib/admin/format";
import { logout } from "@/app/auth/actions";
import { AppHeader } from "@/components/ui/brand";
import { SignOutForm } from "@/components/ui/submit-button";
import { EditorSkeleton } from "@/components/ui/page-skeletons";
import { cardClass, eyebrowClass, linkClass, noticeClass } from "@/components/ui/form";
import { DisconnectButton, SyncReview } from "@/components/restrofuel/sync-review";

export const metadata = privateMetadata("RestroFuel menu — QR Menu");

const ACTIVE_LICENSE = new Set(["pilot", "active", "expiring", "extended"]);
const when = (value: string | null) => value ? formatDateTime(value) : "Never";

async function ReviewContent({ params }: { params: Promise<{ restaurantId: string }> }) {
  await connection();
  await requireUser();
  const { restaurantId } = await params;
  let context;
  try { context = await getTenantContext(restaurantId); }
  catch (error) { if (error instanceof TenantAccessError && error.status === 404) notFound(); throw error; }
  const { review, restaurant, unlinkedCount } = await getReviewPage(context);
  const { link, pending } = review;
  const canManage = can(context, "restaurant:manage");
  const active = link?.status === "ACTIVE";

  return <main className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
    <AppHeader logoHref="/dashboard"><Link href={`/dashboard/${restaurantId}`} className="rounded-full px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">← Menu</Link><SignOutForm action={logout} /></AppHeader>
    <header className="mt-8">
      <p className={eyebrowClass}>RestroFuel</p>
      <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">{pending ? "Review your RestroFuel menu" : "RestroFuel connection"}</h1>
      <p className="mt-1 text-sm text-ink-subtle">{restaurant.name}</p>
    </header>

    {!active && <p role="status" className={`${noticeClass("info")} mt-6`}>
      This menu isn’t connected to RestroFuel. In RestroFuel, open Settings → QR menu and choose Connect QR menu.
    </p>}

    {link && active && <section aria-label="Connection" className={`${cardClass} mt-6 grid gap-3 p-4 text-sm sm:grid-cols-2`}>
      <p><span className="block text-xs text-ink-subtle">Server</span><span className="break-all font-medium">{new URL(link.serverUrl).host}</span></p>
      <p><span className="block text-xs text-ink-subtle">Last pulled</span><span className="font-medium">{when(link.lastSyncedAt)}</span></p>
      <p><span className="block text-xs text-ink-subtle">Last applied</span><span className="font-medium">{when(link.lastAppliedAt)}</span></p>
      <p><span className="block text-xs text-ink-subtle">License</span><span className={`font-medium ${ACTIVE_LICENSE.has(link.licenseState) ? "text-success" : "text-warning"}`}>{ACTIVE_LICENSE.has(link.licenseState) ? "Active" : "Inactive: syncing paused"}</span></p>
    </section>}

    <div className="mt-8">
      {pending && active
        ? <SyncReview restaurantId={restaurantId} pending={pending} firstApply={!link?.lastAppliedAt} unlinkedCount={unlinkedCount}
            published={restaurant.status === "PUBLISHED"} canManage={canManage} />
        : active && <p className={noticeClass("success")}>Your QR menu is up to date. When you change the menu in RestroFuel, press <strong>Sync now</strong> there and the changes will wait here for you.</p>}
    </div>

    {active && canManage && <footer className="mt-12 border-t border-line pt-6"><DisconnectButton restaurantId={restaurantId} /></footer>}
    <p className="mt-6 text-sm"><Link href={`/dashboard/${restaurantId}`} className={linkClass}>Back to your menu</Link></p>
  </main>;
}

export default function RestroFuelReviewPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  return <Suspense fallback={<EditorSkeleton />}><ReviewContent params={params} /></Suspense>;
}
