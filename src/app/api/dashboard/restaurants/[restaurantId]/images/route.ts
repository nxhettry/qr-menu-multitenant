import { createHash } from "node:crypto";
import { z } from "zod";
import { can, getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { executeMenuMutation, MenuEditError } from "@/lib/editor/repository";
import { invalidateMenu } from "@/lib/editor/invalidation";
import { prepareImage } from "@/lib/cloudinary/prepare-image";
import { discardMenuImage, uploadMenuImage } from "@/lib/cloudinary/upload";
import { findReusableAssetId } from "@/lib/media/repository";
import { SHARE_PHOTO_FIELD } from "@/lib/media/schemas";
import { boundedFormData, isSameOrigin } from "@/lib/http/image-request";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const targetSchema = z.object({ kind: z.enum(["logo", "cover", "item"]), item_id: z.uuid().optional() });

function respondSaved(restaurantId: string, receipt: Awaited<ReturnType<typeof executeMenuMutation>>) {
  try { invalidateMenu(restaurantId, receipt, true); }
  catch {
    console.error("Uploaded menu image needs cache refresh", { restaurantId });
    return Response.json({ message: "Image saved.", warning: "Your image is saved, but the public menu refresh is delayed." }, { headers });
  }
  return Response.json({ message: "Image saved." }, { headers });
}

export async function POST(request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  let uploadedId: string | undefined;
  let shareRequested = false;
  try {
    const context = await getTenantContext((await params).restaurantId);
    if (!isSameOrigin(request)) return Response.json({ error: "Reload this page before uploading." }, { status: 403, headers });
    const limit = await checkRateLimit("imageUpload", context.userId);
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter, headers);
    const url = new URL(request.url);
    const target = targetSchema.safeParse({ kind: url.searchParams.get("kind"), item_id: url.searchParams.get("itemId") ?? undefined });
    if (!target.success || (target.data.kind === "item" && !target.data.item_id)) return Response.json({ error: "Choose an image target." }, { status: 400, headers });
    const management = target.data.kind !== "item";
    if (!can(context, management ? "restaurant:manage" : "menu:edit")) return Response.json({ error: "Editing is not permitted." }, { status: 403, headers });
    let image;
    try {
      const form = await boundedFormData(request);
      const file = form.get("image");
      if (!(file instanceof File)) throw new Error("Choose an image file.");
      image = await prepareImage(new Uint8Array(await file.arrayBuffer()), file.type);
      shareRequested = form.get(SHARE_PHOTO_FIELD) === "on";
    } catch {
      return Response.json({ error: "Choose a still JPEG, PNG, or WebP image smaller than 3 MB and 20 megapixels." }, { status: 400, headers });
    }
    const sha256 = createHash("sha256").update(image.bytes).digest("hex");
    if (target.data.kind === "item") {
      const existing = await findReusableAssetId(context, sha256);
      if (existing) {
        const receipt = await executeMenuMutation(context, "useAsset", { item_id: target.data.item_id, asset_id: existing }, false);
        return respondSaved(context.restaurantId, receipt);
      }
    }
    const reservation = await executeMenuMutation(context, "reserveUpload", target.data, management);
    if (!reservation.publicId || !reservation.uploadId) throw new Error("Image upload unavailable");
    const version = await uploadMenuImage(reservation.publicId, image.bytes);
    uploadedId = reservation.publicId;
    const receipt = await executeMenuMutation(context, "attachImage", {
      upload_id: reservation.uploadId, version, sha256, width: image.width, height: image.height, share: shareRequested && target.data.kind === "item",
    }, management);
    uploadedId = undefined;
    return respondSaved(context.restaurantId, receipt);
  } catch (error) {
    if (uploadedId) await discardMenuImage(uploadedId);
    if (error instanceof TenantAccessError) return Response.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof MenuEditError) return Response.json({ error: error.message }, { status: 400, headers });
    console.error("Menu image upload failed");
    return Response.json({ error: "We couldn’t upload this image. Please try again." }, { status: 503, headers });
  }
}
