import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

export function getCloudinary() {
  const config = z.object({
    cloud_name: z.string().min(1), api_key: z.string().min(1), api_secret: z.string().min(1),
  }).parse({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinary.config({ ...config, secure: true });
  return cloudinary;
}
