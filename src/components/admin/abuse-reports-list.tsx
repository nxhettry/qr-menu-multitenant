"use client";
import Link from "next/link";
import { resolveAbuseReportAction } from "@/app/admin/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useAdminList, type AdminListParams } from "@/hooks/use-admin-list";
import type { AbuseReportRow, AdminPage } from "@/lib/admin/schemas";
import { REPORT_REASONS } from "@/lib/abuse/schemas";
import { formatDateTime } from "@/lib/admin/format";
import { cardClass, secondaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";
import { ListError, Pagination } from "./list-controls";

const filters = [["OPEN", "Open"], ["RESOLVED", "Resolved"], ["DISMISSED", "Dismissed"], ["ALL", "All"]] as const;
const reasonLabel = Object.fromEntries(REPORT_REASONS);

export function AbuseReportsList({ userId, initialParams, initialData }: { userId: string; initialParams: AdminListParams; initialData: AdminPage<AbuseReportRow> }) {
  const { params, data, error, mutate, setStatus, setPage, pageCount } = useAdminList("/api/admin/abuse-reports", userId, initialParams, initialData);
  const { pending, result, run } = useAdminAction();
  const resolve = (report: AbuseReportRow, status: "OPEN" | "RESOLVED" | "DISMISSED") => run(() => resolveAbuseReportAction(report.id, status), () => void mutate());
  return <section aria-label="Abuse reports" className="mt-8">
    <div role="group" aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {filters.map(([status, label]) => <button key={label} type="button" aria-pressed={params.status === status} onClick={() => setStatus(status)}
        className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${params.status === status ? "border-ink bg-ink text-canvas" : "border-line-strong text-ink-muted hover:text-ink"}`}>{label}</button>)}
    </div>
    <div className="mt-3"><ActionResult result={result} /></div>
    {error ? <ListError onRetry={() => void mutate()} /> : <>
      <ul className={`${cardClass} mt-5 divide-y divide-line overflow-hidden`}>
        {data?.rows.map(report => <li key={report.id} className="flex flex-col gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="font-semibold">{reasonLabel[report.reason] ?? report.reason}</p>
            <p className="mt-1 text-sm text-ink-muted"><Link href={`/admin/restaurants/${report.restaurantId}`} className="font-medium text-brand hover:underline">{report.restaurantName}</Link> · /{report.restaurantSlug} · {formatDateTime(report.createdAt)}</p>
            {report.details && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6">{report.details}</p>}
            {report.contact && <p className="mt-2 break-words text-sm text-ink-muted">Contact: {report.contact}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {report.status === "OPEN"
              ? <>
                <button type="button" disabled={pending} onClick={() => resolve(report, "RESOLVED")} className={secondaryClass}>Mark resolved</button>
                <button type="button" disabled={pending} onClick={() => resolve(report, "DISMISSED")} className={secondaryClass}>Dismiss</button>
              </>
              : <button type="button" disabled={pending} onClick={() => resolve(report, "OPEN")} className={secondaryClass}>Reopen</button>}
          </div>
        </li>)}
        {data?.rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-muted">No reports here.</li>}
      </ul>
      <Pagination page={params.page} pageCount={pageCount} total={data?.total ?? 0} onPage={setPage} />
    </>}
  </section>;
}
