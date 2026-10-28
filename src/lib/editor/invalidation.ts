import "server-only";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { forgetSlugHistory } from "@/lib/menu/routing";

export function invalidateMenu(restaurantId: string, receipt: { slug: string; previousSlug: string }, fromRoute = false) {
  const tags = new Set([`menu:${restaurantId}`, `menu-slug:${receipt.slug}`, `menu-slug:${receipt.previousSlug}`]);
  for (const tag of tags) {
    if (fromRoute) revalidateTag(tag, { expire: 0 });
    else updateTag(tag);
  }
  forgetSlugHistory(receipt.slug, receipt.previousSlug);
  revalidatePath(`/${receipt.slug}`);
  if (receipt.previousSlug !== receipt.slug) revalidatePath(`/${receipt.previousSlug}`);
}
