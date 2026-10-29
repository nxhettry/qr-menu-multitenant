"use client";
import Link from "next/link";
import { useAdminList, type AdminListParams } from "@/hooks/use-admin-list";
import type { AdminPage, AdminRestaurantRow } from "@/lib/admin/schemas";
import { formatCount, formatDate } from "@/lib/admin/format";
import { cardClass } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListError, Pagination, SearchField } from "./list-controls";

const filters = [[undefined, "All"], ["PUBLISHED", "Live"], ["DRAFT", "Draft"], ["SUSPENDED", "Suspended"]] as const;

export function AdminRestaurantsList({ userId, initialParams, initialData }: { userId: string; initialParams: AdminListParams; initialData: AdminPage<AdminRestaurantRow> }) {
  const { params, data, error, mutate, setSearch, setStatus, setPage, searching, pageCount } = useAdminList("/api/admin/restaurants", userId, initialParams, initialData);
  return <section aria-label="Restaurants" className="mt-8">
    <SearchField label="Search name, address or QR code" value={params.q} onChange={setSearch} busy={searching} />
    <div role="group" aria-label="Filter by status" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {filters.map(([status, label]) => <button key={label} type="button" aria-pressed={params.status === status} onClick={() => setStatus(status)}
        className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${params.status === status ? "border-ink bg-ink text-canvas" : "border-line-strong text-ink-muted hover:text-ink"}`}>{label}</button>)}
    </div>
    {error ? <ListError onRetry={() => void mutate()} /> : <>
      <ul className={`${cardClass} mt-5 divide-y divide-line overflow-hidden`}>
        {data?.rows.map(restaurant => <li key={restaurant.id}>
          <Link href={`/admin/restaurants/${restaurant.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold">{restaurant.name} <span className="font-normal text-ink-subtle">/{restaurant.slug}</span></p>
              <p className="mt-1 truncate text-sm text-ink-muted">{restaurant.ownerEmail ?? "No owner"} · Created {formatDate(restaurant.createdAt)}</p>
              <p className="mt-1 text-sm text-ink-muted">{restaurant.categoryCount} categories · {restaurant.itemCount} items · {formatCount(restaurant.scans30)} scans (30 days)</p>
            </div>
            <StatusBadge tone={restaurant.status} />
          </Link>
        </li>)}
        {data?.rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-muted">No restaurants match this search.</li>}
      </ul>
      <Pagination page={params.page} pageCount={pageCount} total={data?.total ?? 0} onPage={setPage} />
    </>}
  </section>;
}
