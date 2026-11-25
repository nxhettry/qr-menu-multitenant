import { z } from "zod";
import { snapshotSchema } from "./snapshot.ts";

/** What `get_restrofuel_sync` returns: the link and the update waiting for review. */

const timestamp = z.string().nullable();
const linkSchema = z.object({
  serverUrl: z.string(), status: z.enum(["ACTIVE", "DISCONNECTED"]), licenseState: z.string(),
  licenseCheckedAt: z.string(), linkedAt: z.string(), lastSyncedAt: timestamp, lastAppliedAt: timestamp,
});
const fieldChange = z.object({ field: z.string(), from: z.unknown(), to: z.unknown() });
export const syncSummarySchema = z.object({
  added: z.array(z.object({ ref: z.string(), name: z.string(), price_minor: z.number(), category: z.string() })),
  changed: z.array(z.object({ ref: z.string(), name: z.string(), fields: z.array(fieldChange) })),
  removed: z.array(z.object({ ref: z.string(), name: z.string() })),
  restored: z.array(z.object({ ref: z.string(), name: z.string() })),
  renamedCategories: z.array(z.object({ from: z.string(), to: z.string() })),
});
const pendingSchema = z.object({ id: z.uuid(), createdAt: z.string(), summary: syncSummarySchema });

export const syncStatusSchema = z.object({ link: linkSchema.nullable(), pending: pendingSchema.nullable() });
export const syncReviewSchema = z.object({ link: linkSchema.nullable(), pending: pendingSchema.extend({ snapshot: snapshotSchema }).nullable() });

export type SyncStatus = z.infer<typeof syncStatusSchema>;
export type SyncReview = z.infer<typeof syncReviewSchema>;

export const changeCount = (summary: z.infer<typeof syncSummarySchema>) =>
  summary.added.length + summary.changed.length + summary.removed.length + summary.restored.length + summary.renamedCategories.length;
