import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/session";
import { getAdminRestaurant, listAdminEvents } from "@/lib/admin/repository";
import { formatCount, formatDateTime } from "@/lib/admin/format";
import { menuQrUrl } from "@/lib/menu/qr";
import { getSiteOrigin } from "@/lib/env/server";
import { AdminPage } from "@/components/admin/admin-page";
import { DetailCard, DetailList, StatCard } from "@/components/admin/detail";
import { EventList } from "@/components/admin/event-list";
import { RestaurantStatusAction } from "@/components/admin/restaurant-actions";
import { PageTitle } from "@/components/ui/brand";
import { darkClass, linkClass, secondaryClass } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";

type Props = { params: Promise<{ restaurantId: string }> };

async function RestaurantDetail({ params }: Props) {
  await connection();
  await requireSuperAdmin();
  const { restaurantId } = await params;
  if (!z.uuid().safeParse(restaurantId).success) notFound();
  const [restaurant, events] = await Promise.all([getAdminRestaurant(restaurantId), listAdminEvents({ restaurantId })]);
  if (!restaurant) notFound();
  const { scans } = restaurant;
  return <>
    <Link href="/admin/restaurants" className={`${linkClass} text-sm`}>← All restaurants</Link>
    <div className="mt-4"><PageTitle eyebrow="Restaurant" title={restaurant.name}>{restaurant.nameNe && <p lang="ne">{restaurant.nameNe}</p>}</PageTitle></div>
    <div className="mt-3"><StatusBadge tone={restaurant.status} /></div>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href={`/dashboard/${restaurant.id}`} className={darkClass}>Open editor →</Link>
      <Link href={`/dashboard/${restaurant.id}/print`} className={secondaryClass}>Print QR codes</Link>
      <a href={`/${restaurant.slug}`} target="_blank" rel="noopener noreferrer" className={secondaryClass}>Public menu ↗</a>
    </div>
    <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Scans today" value={formatCount(scans.today)} />
      <StatCard label="Scans · 7 days" value={formatCount(scans.week)} />
      <StatCard label="Scans · 30 days" value={formatCount(scans.month)} />
      <StatCard label="Menu" value={formatCount(restaurant.itemCount)} detail={`items in ${restaurant.categoryCount} categories`} />
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <DetailCard title="Details">
        <DetailList items={[
          ["Menu address", `/${restaurant.slug}`], ["QR link", menuQrUrl(getSiteOrigin(), restaurant.shortCode)],
          ["Phone", restaurant.phone ?? "—"], ["Address", restaurant.address ?? "—"],
          ["Created", formatDateTime(restaurant.createdAt)], ["Last updated", formatDateTime(restaurant.updatedAt)],
          ["First published", formatDateTime(restaurant.publishedAt)], ["All-time scans", formatCount(scans.total)],
          ["Plan", restaurant.subscription ? `${restaurant.subscription.plan} · ${restaurant.subscription.status.toLowerCase()}` : "—"],
        ]} />
        {restaurant.description && <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-ink-muted">{restaurant.description}</p>}
      </DetailCard>
      <div className="space-y-4">
        <DetailCard title="Status">
          <p className="mb-4 text-sm leading-6 text-ink-muted">{restaurant.status === "SUSPENDED" ? "The public menu is offline and the owner can’t edit. Restoring returns it to its previous state." : "Suspending takes the public menu offline and locks owner editing. You can still edit it here."}</p>
          <RestaurantStatusAction restaurantId={restaurant.id} suspended={restaurant.status === "SUSPENDED"} />
        </DetailCard>
        <DetailCard title="Team">
          <ul className="space-y-2 text-sm">{restaurant.members.map(member => <li key={member.userId} className="flex items-center justify-between gap-3">
            <Link href={`/admin/users/${member.userId}`} className="truncate font-medium text-brand hover:underline">{member.email ?? member.userId}</Link>
            <span className="text-ink-subtle">{member.role.toLowerCase()}</span>
          </li>)}</ul>
        </DetailCard>
      </div>
      <div className="lg:col-span-2">
        <DetailCard title="Recent activity" action={<Link href={`/admin/activity?restaurantId=${restaurant.id}`} className={`${linkClass} text-sm`}>View all</Link>}>
          <div className="-mx-5 -mb-5 border-t border-line sm:-mx-6 sm:-mb-6"><EventList events={events.slice(0, 10)} showRestaurant={false} /></div>
        </DetailCard>
      </div>
    </div>
  </>;
}

export default function AdminRestaurantPage(props: Props) {
  return <AdminPage><RestaurantDetail {...props} /></AdminPage>;
}
