import "server-only";
import { z } from "zod";
import { getCloudinary } from "@/lib/cloudinary/server";
import { createServiceClient } from "@/lib/supabase/admin";

const uploadsSchema = z.array(z.object({ id: z.uuid(), publicId: z.string() }));
const accountsSchema = z.array(z.object({ userId: z.uuid(), restaurantIds: z.array(z.uuid()) }));

async function call<T extends z.ZodType>(fn: string, args: Record<string, unknown>, schema: T): Promise<z.infer<T>> {
  const { data, error } = await createServiceClient().rpc(fn, args);
  if (error) throw new Error(`${fn} failed: ${error.code}`);
  return schema.parse(data);
}

/** Deletes Cloudinary images that no menu references any more (abandoned or replaced uploads). */
export async function discardUnreferencedUploads(limit = 100) {
  const uploads = await call("list_unreferenced_uploads", { p_limit: limit }, uploadsSchema);
  const cloudinary = getCloudinary();
  const done: string[] = [];
  for (const upload of uploads) {
    try {
      await cloudinary.uploader.destroy(upload.publicId, { resource_type: "image", invalidate: true });
      done.push(upload.id);
    } catch { console.error("Cloudinary cleanup failed", { uploadId: upload.id }); }
  }
  if (done.length) await call("mark_uploads_discarded", { p_ids: done }, z.number());
  return { found: uploads.length, discarded: done.length };
}

/** Permanently deletes accounts whose grace period ended, after removing their Cloudinary folders. */
export async function purgeDueAccounts(limit = 10) {
  const accounts = await call("list_accounts_due_for_purge", { p_limit: limit }, accountsSchema);
  const cloudinary = getCloudinary();
  let purged = 0;
  for (const account of accounts) {
    try {
      let complete = true;
      for (const restaurantId of account.restaurantIds) {
        const result = await cloudinary.api.delete_resources_by_prefix(`qrmenu/${restaurantId}/`, { resource_type: "image", type: "upload" });
        if (result.partial) complete = false;
      }
      if (!complete) continue;
      await call("purge_account", { p_user_id: account.userId }, z.null());
      purged += 1;
    } catch { console.error("Account purge failed", { userId: account.userId }); }
  }
  return { due: accounts.length, purged };
}

export const runDatabaseMaintenance = () => call("run_maintenance", {}, z.object({ rateLimitsRemoved: z.number() }));
