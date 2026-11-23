import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { prepareImage } from "@/lib/cloudinary/prepare-image";
import { discardMenuImage, uploadMenuImage } from "@/lib/cloudinary/upload";
import { addCuratedPhoto, listDishPhotos } from "@/lib/admin/repository";
import { adminJson } from "@/lib/admin/route";
import { getSuperAdmin } from "@/lib/admin/session";
import { boundedFormData, isSameOrigin } from "@/lib/http/image-request";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const dishIdSchema = z.uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ dishId: string }> }) {
  const dishId = dishIdSchema.safeParse((await params).dishId);
  if (!dishId.success) return Response.json({ error: "Dish not found" }, { status: 404, headers });
  return adminJson(() => listDishPhotos(dishId.data));
}

export async function POST(request: Request, { params }: { params: Promise<{ dishId: string }> }) {
  let publicId: string | undefined;
  try {
    const admin = await getSuperAdmin();
    if (!admin) return Response.json({ error: "Not permitted" }, { status: 403, headers });
    if (!isSameOrigin(request)) return Response.json({ error: "Reload this page before uploading." }, { status: 403, headers });
    const dishId = dishIdSchema.safeParse((await params).dishId);
    if (!dishId.success) return Response.json({ error: "Dish not found" }, { status: 404, headers });
    const limit = await checkRateLimit("adminAction", admin.id);
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter, headers);
    let image;
    try {
      const file = (await boundedFormData(request)).get("image");
      if (!(file instanceof File)) throw new Error("Choose an image file.");
      image = await prepareImage(new Uint8Array(await file.arrayBuffer()), file.type);
    } catch {
      return Response.json({ error: "Choose a still JPEG, PNG, or WebP image smaller than 3 MB and 20 megapixels." }, { status: 400, headers });
    }
    publicId = `library/${dishId.data}/${randomUUID()}`;
    const version = await uploadMenuImage(publicId, image.bytes);
    const result = await addCuratedPhoto({
      dishId: dishId.data, publicId, version, width: image.width, height: image.height, sha256: createHash("sha256").update(image.bytes).digest("hex"),
    });
    if (result.duplicate) {
      await discardMenuImage(publicId);
      return Response.json({ message: "This photo is already in the library." }, { headers });
    }
    return Response.json({ message: "Photo added to the library." }, { headers });
  } catch {
    if (publicId) await discardMenuImage(publicId);
    console.error("Curated photo upload failed");
    return Response.json({ error: "We couldn’t add this photo. Please try again." }, { status: 503, headers });
  }
}
