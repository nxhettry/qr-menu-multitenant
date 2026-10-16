import { z } from "zod";
import { can, getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { executeMenuMutation, MenuEditError } from "@/lib/editor/repository";
import { invalidateMenu } from "@/lib/editor/invalidation";
import { MAX_MULTIPART_BYTES, prepareImage } from "@/lib/cloudinary/prepare-image";
import { discardMenuImage, uploadMenuImage } from "@/lib/cloudinary/upload";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const targetSchema = z.object({ kind: z.enum(["logo", "cover", "item"]), item_id: z.uuid().optional() });

async function boundedFormData(request: Request) {
  if (!request.body || !request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new Error("Choose an image file.");
  if (Number(request.headers.get("content-length")) > MAX_MULTIPART_BYTES) throw new Error("Choose an image smaller than 3 MB.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MULTIPART_BYTES) {
        await reader.cancel();
        throw new Error("Choose an image smaller than 3 MB.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
}

export async function POST(request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  let uploadedId: string | undefined;
  try {
    const context = await getTenantContext((await params).restaurantId);
    let sameOrigin = false;
    try {
      const origin = request.headers.get("origin");
      const parsed = new URL(origin ?? "");
      sameOrigin = parsed.origin === origin && ["https:", "http:"].includes(parsed.protocol) && parsed.host === request.headers.get("host");
    } catch { sameOrigin = false; }
    if (!sameOrigin) return Response.json({ error: "Reload this page before uploading." }, { status: 403, headers });
    const url = new URL(request.url);
    const target = targetSchema.safeParse({ kind: url.searchParams.get("kind"), item_id: url.searchParams.get("itemId") ?? undefined });
    if (!target.success || (target.data.kind === "item" && !target.data.item_id)) return Response.json({ error: "Choose an image target." }, { status: 400, headers });
    const management = target.data.kind !== "item";
    if (!can(context, management ? "restaurant:manage" : "menu:edit")) return Response.json({ error: "Editing is not permitted." }, { status: 403, headers });
    const reservation = await executeMenuMutation(context, "reserveUpload", target.data, management);
    if (!reservation.publicId || !reservation.uploadId) throw new Error("Image upload unavailable");
    let image;
    try {
      const form = await boundedFormData(request);
      const file = form.get("image");
      if (!(file instanceof File)) throw new Error("Choose an image file.");
      image = await prepareImage(new Uint8Array(await file.arrayBuffer()), file.type);
    } catch {
      return Response.json({ error: "Choose a still JPEG, PNG, or WebP image smaller than 3 MB and 20 megapixels." }, { status: 400, headers });
    }
    const version = await uploadMenuImage(reservation.publicId, image.bytes);
    uploadedId = reservation.publicId;
    const receipt = await executeMenuMutation(context, "attachImage", { upload_id: reservation.uploadId, version }, management);
    uploadedId = undefined;
    try { invalidateMenu(context.restaurantId, receipt, true); }
    catch {
      console.error("Uploaded menu image needs cache refresh", { restaurantId: context.restaurantId });
      return Response.json({ message: "Image saved.", warning: "Your image is saved, but the public menu refresh is delayed." }, { headers });
    }
    return Response.json({ message: "Image saved." }, { headers });
  } catch (error) {
    if (uploadedId) await discardMenuImage(uploadedId);
    if (error instanceof TenantAccessError) return Response.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof MenuEditError) return Response.json({ error: error.message }, { status: 400, headers });
    console.error("Menu image upload failed");
    return Response.json({ error: "We couldn’t upload this image. Please try again." }, { status: 503, headers });
  }
}
