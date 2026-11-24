"use client";
import { useState } from "react";
import { MenuImageDisplay } from "../menu-image-display";
import { cloudinaryImageUrl } from "@/lib/menu/presentation";
import type { MutationResult } from "@/lib/editor/schemas";
import { uploadMenuImage } from "@/lib/editor/upload-image";
import { FilePickButton } from "./file-pick-button";
import { PhotoLibrary } from "./photo-library";
import { SHARE_PHOTO_FIELD } from "@/lib/media/schemas";
import { FormError, cardClass, primaryClass, secondaryClass } from "@/components/ui/form";

export type ItemLibraryControls = { userId: string; canShare: boolean; onUse: (assetId: string) => void; onShare: (assetId: string, share: boolean) => void };

export function ImageUploader({ restaurantId, kind, itemId, publicId, version, disabled, bare = false, library, onSaved, onRemove }: {
  restaurantId: string; kind: "logo" | "cover" | "item"; itemId?: string; publicId: string | null; version: number | null;
  disabled: boolean; bare?: boolean; library?: ItemLibraryControls; onSaved: () => Promise<unknown>; onRemove: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<MutationResult>({});
  const [share, setShare] = useState(false);
  const imageUrl = cloudinaryImageUrl(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, publicId, version, 320, 240);
  async function upload(file: File) {
    setPending(true); setResult({});
    const outcome = await uploadMenuImage(restaurantId, { kind, itemId, share: kind === "item" && library?.canShare && share }, file);
    setResult(outcome);
    if (!outcome.error) await onSaved();
    setPending(false);
  }
  const busy = disabled || pending;
  return <section aria-label={`${kind} image`} className={bare ? "space-y-4" : `${cardClass} space-y-4 p-5`}>
    {!bare && <h3 className="font-semibold">{kind === "logo" ? "Restaurant logo" : kind === "cover" ? "Cover image" : "Item photo"}</h3>}
    {imageUrl && <MenuImageDisplay key={imageUrl} src={imageUrl} alt={`Current ${kind}`} width={320} height={240} className="h-24 w-32 rounded-xl object-cover" />}
    <p className="text-xs leading-5 text-ink-muted">Optional. Still JPEG, PNG, or WebP, up to 3 MB and 20 megapixels. Each account has a weekly upload limit. Picking a library photo never uses it.</p>
    <div className="flex flex-wrap items-center gap-3">
      <FilePickButton label={`Upload ${kind} image`} disabled={busy} className={primaryClass} onFile={file => void upload(file)}>{pending ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}</FilePickButton>
      {publicId && <button type="button" onClick={onRemove} disabled={busy} className={secondaryClass}>Remove image</button>}
    </div>
    {kind === "item" && library?.canShare && <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" name={SHARE_PHOTO_FIELD} className="mt-1 h-5 w-5 shrink-0" checked={share} disabled={busy} onChange={event => setShare(event.target.checked)} /><span>Let other restaurants use my next upload (reviewed by our team first).</span></label>}
    {kind === "item" && library && itemId && <PhotoLibrary userId={library.userId} restaurantId={restaurantId} itemId={itemId} currentPublicId={publicId} disabled={busy} canShare={library.canShare} onUse={library.onUse} onShare={library.onShare} />}
    <FormError message={result.error} />
    {(result.message || result.warning) && <p role="status" className="text-sm leading-6 text-ink-muted">{result.warning ?? result.message}</p>}
  </section>;
}
