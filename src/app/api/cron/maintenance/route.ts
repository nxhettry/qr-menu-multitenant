import { timingSafeEqual } from "node:crypto";
import { discardUnreferencedUploads, purgeDueAccounts, runDatabaseMaintenance } from "@/lib/maintenance/jobs";

export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store, max-age=0" };

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "Not permitted" }, { status: 401, headers });
  const jobs = { database: runDatabaseMaintenance, uploads: () => discardUnreferencedUploads(), accounts: () => purgeDueAccounts() };
  const results: Record<string, unknown> = {};
  let failed = false;
  for (const [name, run] of Object.entries(jobs)) {
    try { results[name] = await run(); }
    catch (error) {
      failed = true;
      results[name] = { error: "failed" };
      console.error(`Maintenance job failed: ${name}`, error instanceof Error ? error.message : "unknown");
    }
  }
  return Response.json(results, { status: failed ? 500 : 200, headers });
}
