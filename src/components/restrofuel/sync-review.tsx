"use client";
import { useCallback, useMemo, useState } from "react";
import type { SyncMode } from "@/lib/restrofuel/plan";
import { changeCount, type SyncReview as Review } from "@/lib/restrofuel/status";
import { formatDateTime } from "@/lib/admin/format";
import { useRestroFuelReview } from "@/hooks/use-restrofuel-sync";
import { checkboxClass, dangerClass, noticeClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ResultToast } from "@/components/editor/result-toast";
import { SyncSummary } from "./sync-summary";

type Pending = NonNullable<Review["pending"]>;

function ModeChoice({ mode, onChange, unlinkedCount }: { mode: SyncMode; onChange: (mode: SyncMode) => void; unlinkedCount: number }) {
  const option = (value: SyncMode, title: string, body: string) => <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${mode === value ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong"}`}>
    <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => onChange(value)} className={`${checkboxClass} mt-0.5`} />
    <span><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-sm leading-6 text-ink-muted">{body}</span></span>
  </label>;
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-semibold">Your current menu has {unlinkedCount} item{unlinkedCount === 1 ? "" : "s"}</legend>
    {option("merge", "Add RestroFuel items alongside", "Keep everything you have. Items with the same name in the same category are matched, not duplicated.")}
    {option("replace", "Replace my menu", `Delete the ${unlinkedCount} item${unlinkedCount === 1 ? "" : "s"} that aren’t in RestroFuel, and categories left empty.`)}
  </fieldset>;
}

export function SyncReview({ restaurantId, pending, firstApply, unlinkedCount, published, canManage }: {
  restaurantId: string; pending: Pending; firstApply: boolean; unlinkedCount: number; published: boolean; canManage: boolean;
}) {
  const review = useRestroFuelReview(restaurantId, pending.id);
  const [mode, setMode] = useState<SyncMode>("merge");
  const [publish, setPublish] = useState(true);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const categories = useMemo(() => new Map(pending.snapshot.categories.map(category => [category.ref, category.name])), [pending.snapshot.categories]);
  const count = changeCount(pending.summary);
  const askMode = firstApply && unlinkedCount > 0;
  const apply = useCallback(() => {
    if (askMode && mode === "replace") setConfirmReplace(true);
    else review.apply(mode, publish && !published);
  }, [askMode, mode, publish, published, review]);
  const closeConfirm = useCallback(() => setConfirmReplace(false), []);
  const confirm = useCallback(() => { setConfirmReplace(false); review.apply("replace", publish && !published); }, [publish, published, review]);

  return <div className="space-y-6">
    <p className="text-sm leading-6 text-ink-muted">
      {count} change{count === 1 ? "" : "s"} from RestroFuel, pulled {formatDateTime(pending.createdAt)}. Edits you made here are kept unless RestroFuel changed the same thing.
    </p>
    <SyncSummary summary={pending.summary} categories={categories} />
    {!canManage && <p role="status" className={noticeClass("warning")}>Ask an owner or manager to apply this update.</p>}
    {canManage && <div className="space-y-4">
      {askMode && <ModeChoice mode={mode} onChange={setMode} unlinkedCount={unlinkedCount} />}
      {!published && <label className="flex items-start gap-3 text-sm leading-6">
        <input type="checkbox" checked={publish} onChange={event => setPublish(event.target.checked)} className={`${checkboxClass} mt-0.5`} />
        <span>Publish the menu after applying</span>
      </label>}
      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <button type="button" onClick={review.dismiss} disabled={review.pending} className={secondaryClass}>Dismiss update</button>
        <button type="button" onClick={apply} disabled={review.pending} className={primaryClass}>{review.pending ? "Applying…" : publish && !published ? "Apply and publish" : "Apply changes"}</button>
      </div>
    </div>}
    {confirmReplace && <Dialog title="Replace your menu?" description="This can’t be undone." size="sm" onClose={closeConfirm}>
      <p className="text-sm leading-6 text-ink-muted">{unlinkedCount} item{unlinkedCount === 1 ? "" : "s"} not in RestroFuel will be deleted, along with their photos on this menu.</p>
      <DialogFooter><button type="button" onClick={closeConfirm} className={secondaryClass} data-autofocus>Cancel</button><button type="button" onClick={confirm} className={dangerClass}>Replace menu</button></DialogFooter>
    </Dialog>}
    <ResultToast result={review.result} onDismiss={review.clearResult} />
  </div>;
}

export function DisconnectButton({ restaurantId }: { restaurantId: string }) {
  const review = useRestroFuelReview(restaurantId, null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const disconnect = useCallback(() => { setOpen(false); review.disconnect(); }, [review]);
  return <>
    <button type="button" onClick={() => setOpen(true)} disabled={review.pending} className="text-sm font-semibold text-danger underline-offset-4 hover:underline">{review.pending ? "Disconnecting…" : "Disconnect RestroFuel"}</button>
    {open && <Dialog title="Disconnect RestroFuel?" size="sm" onClose={close}>
      <p className="text-sm leading-6 text-ink-muted">Your QR menu stays exactly as it is. RestroFuel can no longer send updates until you connect again from RestroFuel.</p>
      <DialogFooter><button type="button" onClick={close} className={secondaryClass} data-autofocus>Cancel</button><button type="button" onClick={disconnect} className={dangerClass}>Disconnect</button></DialogFooter>
    </Dialog>}
    <ResultToast result={review.result} onDismiss={review.clearResult} />
  </>;
}
