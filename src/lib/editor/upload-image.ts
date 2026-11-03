import type { MutationResult } from "./schemas";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function validateImageFile(file: File) {
  return file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.includes(file.type) ? "Choose a JPEG, PNG, or WebP image smaller than 3 MB." : undefined;
}

export async function uploadMenuImage(restaurantId: string, target: { kind: "logo" | "cover" | "item"; itemId?: string }, file: File): Promise<MutationResult> {
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };
  try {
    const body = new FormData();
    body.set("image", file);
    const query = new URLSearchParams({ kind: target.kind, ...(target.itemId ? { itemId: target.itemId } : {}) });
    const response = await fetch(`/api/dashboard/restaurants/${restaurantId}/images?${query}`, { method: "POST", body });
    const result: MutationResult = await response.json();
    return response.ok ? result : { error: result.error ?? "We couldn’t upload this image." };
  } catch { return { error: "We couldn’t confirm the upload. Refresh before trying again." }; }
}
