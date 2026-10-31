"use client";
import { useCallback, useState } from "react";
import { resolveDishCandidateAction } from "@/app/admin/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useAdminList, type AdminListParams } from "@/hooks/use-admin-list";
import type { AdminPage } from "@/lib/admin/schemas";
import type { CandidateResolution, DishCandidateRow } from "@/lib/dishes/schemas";
import { Dialog } from "@/components/ui/dialog";
import { cardClass, secondaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";
import { DishPicker } from "./dish-picker";
import { ListError, Pagination, SearchField } from "./list-controls";

export function DishCandidatesList({ userId, initialParams, initialData }: { userId: string; initialParams: AdminListParams; initialData: AdminPage<DishCandidateRow> }) {
  const { params, data, error, mutate, setSearch, setPage, searching, pageCount } = useAdminList("/api/admin/dish-candidates", userId, initialParams, initialData);
  const { pending, result, run } = useAdminAction();
  const [aliasFor, setAliasFor] = useState<DishCandidateRow | null>(null);
  const close = useCallback(() => setAliasFor(null), []);
  const resolve = (candidate: DishCandidateRow, resolution: CandidateResolution) => run(() => resolveDishCandidateAction(candidate.normalized, resolution), close);
  return <section aria-label="Names to review" className="mt-6">
    <p className="mb-4 text-sm leading-6 text-ink-muted">Names owners typed that match no catalog dish, most-used first. Add a spelling to an existing dish, create a new dish, or dismiss it.</p>
    <SearchField label="Search names" value={params.q} onChange={setSearch} busy={searching} />
    <div className="mt-3"><ActionResult result={result} /></div>
    {error ? <ListError onRetry={() => void mutate()} /> : <>
      <ul className={`${cardClass} mt-5 divide-y divide-line overflow-hidden`}>
        {data?.rows.map(candidate => <li key={candidate.normalized} className="flex flex-col gap-3 px-5 py-4">
          <div className="min-w-0"><p className="break-words font-semibold">{candidate.name}</p>
            <p className="mt-1 text-sm text-ink-muted">{candidate.restaurantCount} restaurant{candidate.restaurantCount === 1 ? "" : "s"}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => setAliasFor(candidate)} className={secondaryClass}>Add as alias…</button>
            <button type="button" disabled={pending} onClick={() => resolve(candidate, { action: "dish" })} className={secondaryClass}>Create dish</button>
            <button type="button" disabled={pending} onClick={() => resolve(candidate, { action: "dismiss" })} className={secondaryClass}>Dismiss</button>
          </div>
        </li>)}
        {data?.rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-muted">Nothing to review.</li>}
      </ul>
      <Pagination page={params.page} pageCount={pageCount} total={data?.total ?? 0} onPage={setPage} />
    </>}
    {aliasFor && <Dialog title="Add as alias" description={`Which dish is “${aliasFor.name}”?`} onClose={close}>
      <ActionResult result={result} />
      <DishPicker userId={userId} onPick={dish => resolve(aliasFor, { action: "alias", dishId: dish.id })} />
    </Dialog>}
  </section>;
}
