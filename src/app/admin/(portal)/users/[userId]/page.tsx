import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/session";
import { getAdminUser } from "@/lib/admin/repository";
import { formatDateTime, isBanned } from "@/lib/admin/format";
import { AdminPage } from "@/components/admin/admin-page";
import { DetailCard, DetailList } from "@/components/admin/detail";
import { UserActions } from "@/components/admin/user-actions";
import { PageTitle } from "@/components/ui/brand";
import { linkClass } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";

type Props = { params: Promise<{ userId: string }> };

async function UserDetail({ params }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const { userId } = await params;
  if (!z.uuid().safeParse(userId).success) notFound();
  const user = await getAdminUser(userId);
  if (!user) notFound();
  const banned = isBanned(user.bannedUntil);
  const manageable = !user.isSuperAdmin && user.id !== admin.id;
  return <>
    <Link href="/admin/users" className={`${linkClass} text-sm`}>← All users</Link>
    <div className="mt-4"><PageTitle eyebrow="User" title={user.email ?? "No email"} /></div>
    <div className="mt-3 flex flex-wrap gap-2">
      {user.isSuperAdmin && <StatusBadge tone="ADMIN" />}
      {banned && <StatusBadge tone="BANNED" label="Sign-in disabled" />}
      {!user.emailConfirmedAt && <StatusBadge tone="UNVERIFIED" />}
    </div>
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <DetailCard title="Account">
        <DetailList items={[
          ["Joined", formatDateTime(user.createdAt)], ["Last sign-in", formatDateTime(user.lastSignInAt)],
          ["Email verified", formatDateTime(user.emailConfirmedAt)], ["Terms accepted", user.termsVersion ? `v${user.termsVersion} · ${formatDateTime(user.termsAcceptedAt)}` : "Not recorded"],
          ["User ID", <code key="id" className="text-xs">{user.id}</code>],
        ]} />
      </DetailCard>
      <DetailCard title="Manage access">
        {manageable ? <UserActions userId={user.id} banned={banned} />
          : <p className="text-sm leading-6 text-ink-muted">Admin accounts can’t be changed here. Use the Account page to change your own password.</p>}
      </DetailCard>
      <div className="lg:col-span-2">
        <DetailCard title={`Restaurants (${user.restaurants.length})`}>
          {user.restaurants.length ? <ul className="-mx-5 -mb-5 divide-y divide-line border-t border-line sm:-mx-6 sm:-mb-6">
            {user.restaurants.map(restaurant => <li key={restaurant.id}>
              <Link href={`/admin/restaurants/${restaurant.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted sm:px-6">
                <span className="min-w-0"><span className="block truncate font-medium">{restaurant.name}</span><span className="text-sm text-ink-subtle">/{restaurant.slug} · {restaurant.role.toLowerCase()}</span></span>
                <StatusBadge tone={restaurant.status} />
              </Link>
            </li>)}
          </ul> : <p className="text-sm text-ink-muted">This user hasn’t created a restaurant yet.</p>}
        </DetailCard>
      </div>
    </div>
  </>;
}

export default function AdminUserPage(props: Props) {
  return <AdminPage><UserDetail {...props} /></AdminPage>;
}
