"use client";
import Link from "next/link";
import { useAdminList, type AdminListParams } from "@/hooks/use-admin-list";
import type { AdminPage, AdminUserRow } from "@/lib/admin/schemas";
import { formatDate, isBanned } from "@/lib/admin/format";
import { cardClass } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListError, Pagination, SearchField } from "./list-controls";

export function UsersList({ userId, initialParams, initialData }: { userId: string; initialParams: AdminListParams; initialData: AdminPage<AdminUserRow> }) {
  const { params, data, error, mutate, setSearch, setPage, searching, pageCount } = useAdminList("/api/admin/users", userId, initialParams, initialData);
  return <section aria-label="Users" className="mt-8">
    <SearchField label="Search email, restaurant name or address" value={params.q} onChange={setSearch} busy={searching} />
    {error ? <ListError onRetry={() => void mutate()} /> : <>
      <ul className={`${cardClass} mt-5 divide-y divide-line overflow-hidden`}>
        {data?.rows.map(user => <li key={user.id}>
          <Link href={`/admin/users/${user.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.email ?? "No email"}</p>
              <p className="mt-1 text-sm text-ink-muted">Joined {formatDate(user.createdAt)} · {user.restaurantCount} restaurant{user.restaurantCount === 1 ? "" : "s"} · Last sign-in {formatDate(user.lastSignInAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.isSuperAdmin && <StatusBadge tone="ADMIN" />}
              {isBanned(user.bannedUntil) && <StatusBadge tone="BANNED" label="Disabled" />}
              {!user.emailConfirmedAt && <StatusBadge tone="UNVERIFIED" />}
            </div>
          </Link>
        </li>)}
        {data?.rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-muted">No users match this search.</li>}
      </ul>
      <Pagination page={params.page} pageCount={pageCount} total={data?.total ?? 0} onPage={setPage} />
    </>}
  </section>;
}
