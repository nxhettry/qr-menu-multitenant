"use client";
import { useState } from "react";
import { reviewPhotoAction } from "@/app/admin/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useDishPhotos } from "@/hooks/use-dish-photos";
import { validateImageFile } from "@/lib/editor/upload-image";
import { cloudinaryImageUrl } from "@/lib/menu/presentation";
import type { AdminActionState } from "@/lib/admin/schemas";
import { FilePickButton } from "@/components/editor/file-pick-button";
import { MenuImageDisplay } from "@/components/menu-image-display";
import { secondaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

async function uploadDishPhoto(dishId: string, file: File): Promise<AdminActionState> {
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };
  try {
    const body = new FormData();
    body.set("image", file);
    const response = await fetch(`/api/admin/dishes/${dishId}/photos`, { method: "POST", body });
    const result: AdminActionState = await response.json();
    return response.ok ? result : { error: result.error ?? "We couldn’t add this photo." };
  } catch { return { error: "We couldn’t confirm the upload. Refresh before trying again." }; }
}

/** Photos restaurants can pick for this dish: curated uploads and approved shared photos. */
export function DishPhotos({ userId, dishId }: { userId: string; dishId: string }) {
  const { data, error, mutate } = useDishPhotos(userId, dishId);
  const { pending, result, run } = useAdminAction();
  const [uploading, setUploading] = useState(false);
  const [upload, setUpload] = useState<AdminActionState>({});
  async function add(file: File) {
    setUploading(true); setUpload({});
    const outcome = await uploadDishPhoto(dishId, file);
    setUpload(outcome);
    if (!outcome.error) await mutate();
    setUploading(false);
  }
  const busy = pending || uploading;
  return <section aria-label="Library photos" className="mt-6 border-t border-line pt-5">
    <h3 className="font-semibold">Library photos</h3>
    <p className="mt-1 text-sm text-ink-muted">Restaurants with this dish can pick these without uploading their own.</p>
    {error ? <p role="alert" className="mt-3 text-sm text-danger">Couldn’t load photos. Reopen this dialog to retry.</p> : <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data?.map(photo => {
        const url = cloudinaryImageUrl(cloudName, photo.publicId, photo.version, 240, 180);
        return <li key={photo.id} className="space-y-2">
          {url && <MenuImageDisplay src={url} alt="" width={240} height={180} className="aspect-[4/3] w-full rounded-xl object-cover" />}
          <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
            <span>{photo.source === "CURATED" ? "Curated" : "Shared"}</span>
            <button type="button" disabled={busy} onClick={() => run(() => reviewPhotoAction(photo.id, "REJECT", null), () => void mutate())} className="min-h-8 font-medium text-danger hover:underline">Remove</button>
          </div>
        </li>;
      })}
      {data?.length === 0 && <li className="col-span-full text-sm text-ink-muted">No photos yet.</li>}
    </ul>}
    <div className="mt-4"><FilePickButton label="Add a library photo" disabled={busy} className={secondaryClass} onFile={file => void add(file)}>{uploading ? "Uploading…" : "Add photo"}</FilePickButton></div>
    <div className="mt-3"><ActionResult result={upload.error || upload.message ? upload : result} /></div>
  </section>;
}
