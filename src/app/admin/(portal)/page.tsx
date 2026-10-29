import Link from "next/link";
import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { getAdminOverview, listAdminEvents } from "@/lib/admin/repository";
import { formatCount } from "@/lib/admin/format";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { DetailCard, StatCard } from "@/components/admin/detail";
import { EventList } from "@/components/admin/event-list";
import { linkClass } from "@/components/ui/form";

async function Overview() {
  await connection();
  await requireSuperAdmin();
  const [overview, events] = await Promise.all([getAdminOverview(), listAdminEvents({})]);
  const { users, restaurants, scans } = overview;
  return <>
    <PageTitle eyebrow="Platform" title="Overview." />
    <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Restaurants" value={formatCount(restaurants.total)} detail={`+${restaurants.new7} this week · +${restaurants.new30} in 30 days`} />
      <StatCard label="Live menus" value={formatCount(restaurants.published)} detail={`${restaurants.draft} draft · ${restaurants.suspended} suspended`} />
      <StatCard label="Users" value={formatCount(users.total)} detail={`+${users.new7} this week · ${users.total - users.verified} unverified`} />
      <StatCard label="QR scans today" value={formatCount(scans.today)} detail={`${formatCount(scans.week)} in 7 days · ${formatCount(scans.month)} in 30`} />
      <StatCard label="Menu items" value={formatCount(overview.items)} />
      <StatCard label="Disabled accounts" value={formatCount(users.banned)} />
    </div>
    <div className="mt-8">
      <DetailCard title="Recent activity" action={<Link href="/admin/activity" className={`${linkClass} text-sm`}>View all</Link>}>
        <div className="-mx-5 -mb-5 border-t border-line sm:-mx-6 sm:-mb-6"><EventList events={events.slice(0, 10)} /></div>
      </DetailCard>
    </div>
  </>;
}

export default function AdminOverviewPage() {
  return <AdminPage><Overview /></AdminPage>;
}
