import { z } from "zod";

export const SHARE_PHOTO_FIELD = "sharePhoto";

const base = { id: z.uuid(), publicId: z.string(), version: z.number().int().positive() };
export const photoOptionsSchema = z.object({
  own: z.array(z.object({ ...base, visibility: z.enum(["PRIVATE", "PENDING", "PUBLIC", "REJECTED"]) })),
  library: z.array(z.object(base)),
});
export type PhotoOptions = z.infer<typeof photoOptionsSchema>;
export type PhotoOption = PhotoOptions["library"][number];
