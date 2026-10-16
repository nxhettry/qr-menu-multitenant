import "server-only";
import type { UploadApiResponse } from "cloudinary";
import { getCloudinary } from "./server.ts";
import { MAX_IMAGE_BYTES } from "./prepare-image.ts";

export async function uploadMenuImage(publicId: string, bytes: Buffer) {
  const cloudinary = getCloudinary();
  const asset = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      public_id: publicId, resource_type: "image", type: "upload", format: "webp", overwrite: false,
      allowed_formats: ["webp"], timeout: 45000,
    }, (error, result) => error || !result ? reject(new Error("Image upload failed")) : resolve(result));
    stream.end(bytes);
  });
  if (asset.public_id !== publicId || asset.resource_type !== "image" || asset.format !== "webp" ||
    !Number.isSafeInteger(asset.version) || asset.version <= 0 || asset.width > 1600 || asset.height > 1600 || asset.bytes > MAX_IMAGE_BYTES) {
    await discardMenuImage(publicId);
    throw new Error("Could not verify the uploaded image");
  }
  return asset.version;
}

export async function discardMenuImage(publicId: string) {
  try { await getCloudinary().uploader.destroy(publicId, { resource_type: "image" }); }
  catch { console.error("Unused menu image cleanup needed", { publicId }); }
}
