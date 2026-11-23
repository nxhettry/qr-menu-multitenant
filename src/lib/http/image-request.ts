import { MAX_MULTIPART_BYTES } from "@/lib/cloudinary/prepare-image";

export function isSameOrigin(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const parsed = new URL(origin ?? "");
    return parsed.origin === origin && ["https:", "http:"].includes(parsed.protocol) && parsed.host === request.headers.get("host");
  } catch { return false; }
}

/** Reads a multipart body, stopping as soon as it exceeds the image size limit. */
export async function boundedFormData(request: Request) {
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
