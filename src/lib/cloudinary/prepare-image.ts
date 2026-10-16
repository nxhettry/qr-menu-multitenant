import sharp from "sharp";

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
const formats: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function prepareImage(bytes: Uint8Array, contentType: string) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Choose an image smaller than 3 MB.");
  const source = sharp(bytes, { limitInputPixels: 20000000, failOn: "warning", animated: false });
  const metadata = await source.metadata();
  if (!metadata.format || formats[metadata.format] !== contentType || !metadata.width || !metadata.height ||
    metadata.width > 12000 || metadata.height > 12000 || (metadata.pages ?? 1) > 1) {
    throw new Error("Choose a still JPEG, PNG, or WebP image.");
  }
  const { data, info } = await source.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
  if (data.length > MAX_IMAGE_BYTES) throw new Error("This image is too large. Choose a smaller image.");
  return { bytes: data, width: info.width, height: info.height };
}
