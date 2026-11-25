import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getRestroFuelLinkKey } from "@/lib/env/server";
import { can, type TenantContext } from "@/lib/tenancy/context";
import { callMenuRpc, getEditorData } from "@/lib/editor/repository";
import { checkLicense, type LicenseCheck } from "./license";
import { decryptSecret, encryptSecret, verifySignature } from "./crypto";
import { fetchMenu, redeemConnectCode, RestroFuelError, unlink } from "./client";
import { isEmptySummary, planSync, summarize, type MenuState, type SyncMode } from "./plan";
import { parseConnectParams } from "./connect-link";
import { syncReviewSchema, syncStatusSchema } from "./status";

export { RestroFuelError };

const licenseMessages: Record<Exclude<LicenseCheck, { ok: true }>["reason"], string> = {
  invalid: "We couldn’t confirm this is a licensed RestroFuel restaurant. Update RestroFuel and try again.",
  other_restaurant: "This RestroFuel license belongs to a different restaurant.",
  inactive: "Your RestroFuel license isn’t active, so syncing is paused. Your QR menu keeps working.",
};

function requireLicense(token: unknown, tenantSlug: string) {
  const license = checkLicense(token, tenantSlug);
  if (!license.ok) throw new RestroFuelError(licenseMessages[license.reason]);
  return license;
}

const refRow = z.object({ id: z.uuid(), ref: z.string(), base: z.record(z.string(), z.unknown()).nullable(), deleted: z.boolean() });
const menuStateSchema = z.object({ categories: z.array(refRow), items: z.array(refRow) });
const parseState = (data: unknown) => menuStateSchema.parse(data) as unknown as MenuState;

type ActiveLink = { linkId: string; restaurantId: string; serverUrl: string; tenantSlug: string; secret: string };

/** Pulls the menu and stages what changed for the owner to review. */
async function pullAndStage(link: ActiveLink, force = false) {
  const { snapshot, license } = await fetchMenu(link.serverUrl, link.secret);
  const checked = requireLicense(license, link.tenantSlug);
  const service = createServiceClient();
  const { data: state, error: stateError } = await service.rpc("get_restrofuel_menu_state", { p_restaurant_id: link.restaurantId });
  if (stateError) throw new Error("Could not read the synced menu");
  const summary = summarize(snapshot, parseState(state));
  const changed = force || !isEmptySummary(summary);
  const { data, error } = await service.rpc("stage_restrofuel_snapshot", {
    p_link_id: link.linkId, p_license_state: checked.state, p_snapshot: changed ? snapshot : null, p_summary: changed ? summary : null,
  });
  if (error) throw new Error("Could not stage the RestroFuel menu");
  return z.object({ status: z.enum(["staged", "up_to_date"]) }).parse(data);
}

export async function connectRestaurant(context: TenantContext, input: { server: unknown; code: unknown }) {
  if (!can(context, "restaurant:manage")) throw new RestroFuelError("Only an owner or manager can connect RestroFuel.");
  const link = parseConnectParams(input.server, input.code);
  if (!link) throw new RestroFuelError("This connect link isn’t valid. Start again from RestroFuel.");
  const { server } = link;
  const redeemed = await redeemConnectCode(server.url, link.code, context.restaurantId);
  const license = requireLicense(redeemed.license, server.tenantSlug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_restrofuel_link", {
    p_restaurant_id: context.restaurantId, p_link_id: redeemed.linkId, p_server_url: server.url, p_tenant_slug: server.tenantSlug,
    p_secret_cipher: encryptSecret(redeemed.secret, getRestroFuelLinkKey()), p_license_state: license.state,
  });
  if (error) throw new RestroFuelError("We couldn’t save the RestroFuel connection. Please try again.");
  await pullAndStage({ linkId: redeemed.linkId, restaurantId: context.restaurantId, serverUrl: server.url, tenantSlug: server.tenantSlug, secret: redeemed.secret }, true);
}

const linkRecord = z.object({
  restaurantId: z.uuid(), linkId: z.uuid(), serverUrl: z.string(), tenantSlug: z.string(), secretCipher: z.string(),
  status: z.enum(["ACTIVE", "DISCONNECTED"]),
});
const eventBody = z.object({ event: z.enum(["sync", "disconnect"]), qrRestaurantId: z.uuid() });

export class SignatureError extends Error {}

/** A signed call from a RestroFuel server: "sync" pulls and stages, "disconnect" ends the link. */
export async function handleServerEvent(event: string, headers: Headers, rawBody: string) {
  const linkId = z.uuid().safeParse(headers.get("x-restrofuel-link"));
  if (!linkId.success) throw new SignatureError();
  const { data, error } = await createServiceClient().rpc("get_restrofuel_link", { p_link_id: linkId.data });
  if (error) throw new Error("Could not read the RestroFuel link");
  const link = linkRecord.safeParse(data);
  if (!link.success || link.data.status !== "ACTIVE") throw new SignatureError();
  const secret = decryptSecret(link.data.secretCipher, getRestroFuelLinkKey());
  if (!verifySignature(secret, headers.get("x-restrofuel-timestamp"), rawBody, headers.get("x-restrofuel-signature"))) throw new SignatureError();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { throw new SignatureError(); }
  const parsed = eventBody.safeParse(body);
  if (!parsed.success || parsed.data.event !== event || parsed.data.qrRestaurantId !== link.data.restaurantId) throw new SignatureError();

  if (event === "disconnect") {
    const { error: endError } = await createServiceClient().rpc("end_restrofuel_link", { p_link_id: link.data.linkId });
    if (endError) throw new Error("Could not end the RestroFuel link");
    return { status: "disconnected" as const };
  }
  return pullAndStage({ ...link.data, secret });
}

export async function getSyncStatus(context: TenantContext) {
  const { data, error } = await (await createClient()).rpc("get_restrofuel_sync", { p_restaurant_id: context.restaurantId });
  if (error) throw new Error("Could not load the RestroFuel status");
  return syncStatusSchema.parse(data);
}

export async function getSyncReview(context: TenantContext) {
  const { data, error } = await (await createClient()).rpc("get_restrofuel_sync", { p_restaurant_id: context.restaurantId });
  if (error) throw new Error("Could not load the RestroFuel update");
  return syncReviewSchema.parse(data);
}

async function loadSyncInputs(context: TenantContext) {
  const [review, menu, stateResult] = await Promise.all([
    getSyncReview(context), getEditorData(context),
    (await createClient()).rpc("get_restrofuel_menu_state", { p_restaurant_id: context.restaurantId }),
  ]);
  if (stateResult.error) throw new Error("Could not read the synced menu");
  return { review, menu, state: parseState(stateResult.data) };
}

export async function applySync(context: TenantContext, input: { snapshotId: string; mode: SyncMode; publish: boolean }) {
  const { review, menu, state } = await loadSyncInputs(context);
  if (!review.pending || review.pending.id !== input.snapshotId) {
    throw new RestroFuelError("This RestroFuel update was already handled. Refresh the page");
  }
  const plan = planSync({
    snapshot: review.pending.snapshot, state, categories: menu.categories,
    mode: input.mode, publish: input.publish, published: menu.restaurant.status === "PUBLISHED",
  });
  return callMenuRpc(context, true, supabase => supabase.rpc("apply_restrofuel_sync", {
    p_restaurant_id: context.restaurantId, p_snapshot_id: input.snapshotId, p_plan: plan,
  }));
}

export function dismissSync(context: TenantContext, snapshotId: string) {
  return callMenuRpc(context, true, supabase => supabase.rpc("dismiss_restrofuel_sync", {
    p_restaurant_id: context.restaurantId, p_snapshot_id: snapshotId,
  }));
}

/** Ends the link here, then tells the RestroFuel server if it can be reached. */
export async function disconnectRestaurant(context: TenantContext) {
  if (!can(context, "restaurant:manage")) throw new RestroFuelError("Only an owner or manager can disconnect RestroFuel.");
  const { data, error } = await (await createClient()).rpc("disconnect_restrofuel", { p_restaurant_id: context.restaurantId });
  if (error) throw new RestroFuelError("We couldn’t disconnect RestroFuel. Please try again.");
  const ended = z.object({ serverUrl: z.string(), secretCipher: z.string() }).parse(data);
  await unlink(ended.serverUrl, decryptSecret(ended.secretCipher, getRestroFuelLinkKey()))
    .catch(() => console.error("RestroFuel server was not told about the disconnect", { restaurantId: context.restaurantId }));
}

/** Everything the review page shows. Items without a RestroFuel ref are the owner's own. */
export async function getReviewPage(context: TenantContext) {
  const { review, menu, state } = await loadSyncInputs(context);
  const linked = new Set(state.items.filter(row => !row.deleted).map(row => row.id));
  const unlinkedCount = menu.categories.reduce((total, category) => total + category.items.filter(item => !linked.has(item.id)).length, 0);
  return { review, restaurant: menu.restaurant, unlinkedCount };
}
