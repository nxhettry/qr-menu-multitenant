"use client";
import { useState } from "react";
import { MenuImageDisplay } from "../menu-image-display";
import { cloudinaryImageUrl } from "@/lib/menu/presentation";
import type { MutationResult } from "@/lib/editor/schemas";
import { FormError, primaryClass, secondaryClass } from "./form-fields";

export function ImageUploader({ restaurantId, kind, itemId, publicId, version, disabled, onSaved, onRemove }: {
  restaurantId: string; kind: "logo" | "cover" | "item"; itemId?: string; publicId: string | null; version: number | null;
  disabled: boolean; onSaved: () => Promise<unknown>; onRemove: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<MutationResult>({});
  const imageUrl = cloudinaryImageUrl(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, publicId, version, 320, 240);
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setResult({ error: "Choose a JPEG, PNG, or WebP image smaller than 3 MB." }); return;
    }
    setPending(true); setResult({});
    try {
      const body = new FormData(); body.set("image", file);
      const query = new URLSearchParams({ kind, ...(itemId ? { itemId } : {}) });
      const response = await fetch(`/api/dashboard/restaurants/${restaurantId}/images?${query}`, { method: "POST", body });
      const result: MutationResult = await response.json();
      setResult(response.ok ? result : { error: result.error ?? "We couldn’t upload this image." });
      if (response.ok) await onSaved();
    } catch { setResult({ error: "We couldn’t confirm the upload. Refresh before trying again." }); }
    finally { setPending(false); }
  }
  return <section aria-label={`${kind} image`} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
    <h3 className="font-semibold">{kind === "logo" ? "Restaurant logo" : kind === "cover" ? "Cover image" : "Item photo"}</h3>
    {imageUrl && <MenuImageDisplay key={imageUrl} src={imageUrl} alt={`Current ${kind}`} width={320} height={240} className="h-24 w-32 rounded-xl object-cover" />}
    <p className="text-xs leading-5 text-stone-600">Optional. Still JPEG, PNG, or WebP, up to 3 MB and 20 megapixels. Up to 20 upload attempts per restaurant in 24 hours.</p>
    <div className="flex flex-wrap items-center gap-3">
      <label className={`${primaryClass} relative inline-flex cursor-pointer focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-orange-700 ${disabled || pending ? "opacity-50" : ""}`}>
        {pending ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || pending} aria-label={`Upload ${kind} image`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
      {publicId && <button type="button" onClick={onRemove} disabled={disabled || pending} className={secondaryClass}>Remove image</button>}
    </div>
    <FormError message={result.error} />
    {(result.message || result.warning) && <p role="status" className="text-sm leading-6 text-stone-600">{result.warning ?? result.message}</p>}
  </section>;
}
