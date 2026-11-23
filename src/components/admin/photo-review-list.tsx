"use client";
import { memo, useCallback, useState } from "react";
import Link from "next/link";
import { reviewPhotoAction } from "@/app/admin/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useAdminList, type AdminListParams } from "@/hooks/use-admin-list";
import type { AdminPage, PhotoReviewRow } from "@/lib/admin/schemas";
import { cloudinaryImageUrl } from "@/lib/menu/presentation";
import { formatDateTime } from "@/lib/admin/format";
import { MenuImageDisplay } from "@/components/menu-image-display";
import { cardClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";
import { DishPicker } from "./dish-picker";
import { ListError, Pagination } from "./list-controls";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const filters = [["PENDING", "Waiting"], ["PUBLIC", "Approved"], ["REJECTED", "Rejected"]] as const;

type Decide = (photo: PhotoReviewRow, decision: "APPROVE" | "REJECT", dishId?: string) => void;

const PhotoRow = memo(function PhotoRow({ userId, photo, pending, onDecide }: { userId: string; photo: PhotoReviewRow; pending: boolean; onDecide: Decide }) {
  const [choosing, setChoosing] = useState(false);
  const url = cloudinaryImageUrl(cloudName, photo.publicId, photo.version, 480, 360);
  const approve = () => photo.dishId ? onDecide(photo, "APPROVE") : setChoosing(true);
  return <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row">
    <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:w-48">
      {url && <MenuImageDisplay src={url} alt={photo.dishName ?? "Shared photo"} width={480} height={360} className="h-full w-full object-cover" />}
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-semibold">{photo.dishName ?? "No dish chosen"}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {photo.restaurantId ? <Link href={`/admin/restaurants/${photo.restaurantId}`} className="font-medium text-brand hover:underline">{photo.restaurantName}</Link> : "Removed restaurant"} · {formatDateTime(photo.createdAt)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {photo.visibility !== "PUBLIC" && <button type="button" disabled={pending} onClick={approve} className={primaryClass}>Approve</button>}
        {photo.visibility !== "REJECTED" && <button type="button" disabled={pending} onClick={() => onDecide(photo, "REJECT")} className={secondaryClass}>{photo.visibility === "PUBLIC" ? "Remove from library" : "Reject"}</button>}
      </div>
      {choosing && <div className="mt-4"><DishPicker userId={userId} onPick={dish => { setChoosing(false); onDecide(photo, "APPROVE", dish.id); }} /></div>}
    </div>
  </li>;
});

export function PhotoReviewList({ userId, initialParams, initialData }: { userId: string; initialParams: AdminListParams; initialData: AdminPage<PhotoReviewRow> }) {
  const { params, data, error, mutate, setStatus, setPage, pageCount } = useAdminList("/api/admin/photos", userId, initialParams, initialData);
  const { pending, result, run } = useAdminAction();
  const decide = useCallback<Decide>((photo, decision, dishId) => run(() => reviewPhotoAction(photo.id, decision, dishId ?? null), () => void mutate()), [run, mutate]);
  return <section aria-label="Shared photos" className="mt-8">
    <div role="group" aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {filters.map(([status, label]) => <button key={status} type="button" aria-pressed={params.status === status} onClick={() => setStatus(status)}
        className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${params.status === status ? "border-ink bg-ink text-canvas" : "border-line-strong text-ink-muted hover:text-ink"}`}>{label}</button>)}
    </div>
    <div className="mt-3"><ActionResult result={result} /></div>
    {error ? <ListError onRetry={() => void mutate()} /> : <>
      <ul className={`${cardClass} mt-5 divide-y divide-line overflow-hidden`}>
        {data?.rows.map(photo => <PhotoRow key={photo.id} userId={userId} photo={photo} pending={pending} onDecide={decide} />)}
        {data?.rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-muted">No photos here.</li>}
      </ul>
      <Pagination page={params.page} pageCount={pageCount} total={data?.total ?? 0} onPage={setPage} />
    </>}
  </section>;
}
