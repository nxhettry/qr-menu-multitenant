"use client";
import { useCallback, useState } from "react";
import { mergeDishesAction, saveDishAction } from "@/app/admin/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useAdminList, type AdminListParams } from "@/hooks/use-admin-list";
import type { AdminPage } from "@/lib/admin/schemas";
import type { AdminDishRow, DishInput } from "@/lib/dishes/schemas";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { cardClass, dangerClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionResult } from "./action-result";
import { DishForm } from "./dish-form";
import { DishPicker } from "./dish-picker";
import { ListError, Pagination, SearchField } from "./list-controls";

type DialogState = { kind: "edit"; dish?: AdminDishRow } | { kind: "merge"; dish: AdminDishRow; target?: AdminDishRow } | null;
const filters = [[undefined, "All"], ["ACTIVE", "Active"], ["HIDDEN", "Hidden"]] as const;

export function DishesList({ userId, initialParams, initialData }: { userId: string; initialParams: AdminListParams; initialData: AdminPage<AdminDishRow> }) {
  const { params, data, error, mutate, setSearch, setStatus, setPage, searching, pageCount } = useAdminList("/api/admin/dishes", userId, initialParams, initialData);
  const { pending, result, run } = useAdminAction();
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = useCallback(() => setDialog(null), []);
  const save = (input: DishInput) => run(() => saveDishAction(input), close);
  return <section aria-label="Dishes" className="mt-6">
    <div className="flex flex-col gap-3 sm:flex-row">
      <SearchField label="Search name, Nepali name, alias or category" value={params.q} onChange={setSearch} busy={searching} />
      <button type="button" onClick={() => setDialog({ kind: "edit" })} className={primaryClass}>Add dish</button>
    </div>
    <div role="group" aria-label="Filter by status" className="mt-3 flex gap-2">
      {filters.map(([value, label]) => <button key={label} type="button" aria-pressed={params.status === value} onClick={() => setStatus(value)}
        className={`min-h-10 rounded-full px-4 text-sm font-medium ${params.status === value ? "bg-ink text-canvas" : "bg-surface-muted text-ink-muted hover:text-ink"}`}>{label}</button>)}
    </div>
    {!dialog && <div className="mt-3"><ActionResult result={result} /></div>}
    {error ? <ListError onRetry={() => void mutate()} /> : <>
      <ul className={`${cardClass} mt-5 divide-y divide-line overflow-hidden`}>
        {data?.rows.map(dish => <li key={dish.id}>
          <button type="button" onClick={() => setDialog({ kind: "edit", dish })} className="flex min-h-14 w-full flex-col gap-1 px-5 py-4 text-left transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{dish.name}</span>
              <span className="mt-1 block truncate text-sm text-ink-muted">{[dish.nameNe, dish.category, `${dish.itemCount} menu item${dish.itemCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</span>
            </span>
            {dish.status === "HIDDEN" && <StatusBadge tone="DRAFT" label="Hidden" />}
          </button>
        </li>)}
        {data?.rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-muted">No dishes match this search.</li>}
      </ul>
      <Pagination page={params.page} pageCount={pageCount} total={data?.total ?? 0} onPage={setPage} />
    </>}
    {dialog?.kind === "edit" && <Dialog title={dialog.dish ? "Edit dish" : "Add a dish"} description={dialog.dish?.name} size="lg" onClose={close}>
      <DishForm dish={dialog.dish} pending={pending} error={result.error} onSave={save} onCancel={close} />
      {dialog.dish && <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm text-ink-muted">Same dish listed twice? Merge this one into another: its menu items move across and its names become aliases.</p>
        <button type="button" onClick={() => setDialog({ kind: "merge", dish: dialog.dish! })} className={`${secondaryClass} mt-3`}>Merge into another dish…</button>
      </div>}
    </Dialog>}
    {dialog?.kind === "merge" && <Dialog title={`Merge “${dialog.dish.name}”`} description="Choose the dish to keep" onClose={close}>
      {dialog.target ? <div className="space-y-4">
        <p className="text-sm leading-6">“{dialog.dish.name}” will be removed. Its {dialog.dish.itemCount} menu item{dialog.dish.itemCount === 1 ? "" : "s"} will link to <strong>{dialog.target.name}</strong>, and its names become aliases of it. This can’t be undone.</p>
        <ActionResult result={result} />
        <DialogFooter>
          <button type="button" disabled={pending} onClick={() => run(() => mergeDishesAction(dialog.dish.id, dialog.target!.id), close)} className={dangerClass}>{pending ? "Merging…" : "Merge dishes"}</button>
          <button type="button" onClick={() => setDialog({ kind: "merge", dish: dialog.dish })} className={secondaryClass}>Choose another</button>
        </DialogFooter>
      </div> : <DishPicker userId={userId} excludeId={dialog.dish.id} onPick={target => setDialog({ kind: "merge", dish: dialog.dish, target })} />}
    </Dialog>}
  </section>;
}
