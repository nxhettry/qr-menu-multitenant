"use client";
import { memo, useState } from "react";
import { MenuImageDisplay } from "@/components/menu-image-display";
import { cloudinaryImageUrl } from "@/lib/menu/presentation";
import { usePhotoOptions } from "@/hooks/use-photo-options";
import type { PhotoOption } from "@/lib/media/schemas";
import { secondaryClass } from "@/components/ui/form";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const sharingLabels = { PENDING: "Waiting for review", PUBLIC: "Shared", REJECTED: "Not shared" } as const;

const PhotoChoice = memo(function PhotoChoice({ photo, current, disabled, note, onPick }: {
  photo: PhotoOption; current: boolean; disabled: boolean; note?: string; onPick: (assetId: string) => void;
}) {
  const url = cloudinaryImageUrl(cloudName, photo.publicId, photo.version, 192, 144);
  return <li>
    <button type="button" disabled={disabled || current} onClick={() => onPick(photo.id)} aria-label={current ? "Current photo" : "Use this photo"}
      className="group relative block min-h-11 w-full overflow-hidden rounded-xl border border-line bg-surface-muted text-left transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60">
      {url && <MenuImageDisplay src={url} alt="" width={192} height={144} className="aspect-[4/3] w-full object-cover" />}
      {(current || note) && <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-ink/80 px-2 py-0.5 text-center text-[11px] font-medium text-canvas">{current ? "In use" : note}</span>}
    </button>
  </li>;
});

export function PhotoLibrary({ userId, restaurantId, itemId, currentPublicId, disabled, canShare, onUse, onShare }: {
  userId: string; restaurantId: string; itemId: string; currentPublicId: string | null; disabled: boolean; canShare: boolean;
  onUse: (assetId: string) => void; onShare: (assetId: string, share: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, error, isLoading } = usePhotoOptions(userId, restaurantId, itemId, open);
  const shareable = data?.own.find(photo => photo.publicId === currentPublicId);
  return <div className="space-y-3">
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className={secondaryClass}>{open ? "Hide photo library" : "Choose from library"}</button>
    {open && <div className="space-y-4">
      {isLoading && <p role="status" className="text-sm text-ink-muted">Loading photos…</p>}
      {error && <p role="alert" className="text-sm text-danger">We couldn’t load your photos. Close and try again.</p>}
      {data && <>
        <section aria-label="Library photos"><h4 className="text-sm font-semibold">Ready-made photos for this dish</h4>
          {data.library.length
            ? <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{data.library.map(photo => <PhotoChoice key={photo.id} photo={photo} current={photo.publicId === currentPublicId} disabled={disabled} onPick={onUse} />)}</ul>
            : <p className="mt-1 text-sm leading-6 text-ink-muted">No ready-made photos for this dish yet. Upload your own instead.</p>}
        </section>
        {data.own.length > 0 && <section aria-label="Your photos"><h4 className="text-sm font-semibold">Your earlier uploads</h4>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{data.own.map(photo => <PhotoChoice key={photo.id} photo={photo} current={photo.publicId === currentPublicId} disabled={disabled}
            note={photo.visibility === "PRIVATE" ? undefined : sharingLabels[photo.visibility]} onPick={onUse} />)}</ul>
        </section>}
        {canShare && shareable && shareable.visibility !== "PUBLIC" && shareable.visibility !== "REJECTED" && <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={shareable.visibility === "PENDING"} disabled={disabled} onChange={event => onShare(shareable.id, event.target.checked)} />
          <span>Let other restaurants use this photo. It stays private until our team approves it.</span>
        </label>}
      </>}
    </div>}
  </div>;
}
