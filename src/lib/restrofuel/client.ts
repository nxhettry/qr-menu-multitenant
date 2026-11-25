import "server-only";
import { z } from "zod";
import { snapshotSchema } from "./snapshot";

/** Calls to a RestroFuel server through its tunnel (server/src/qr-menu in RestroFuelVat). */

export class RestroFuelError extends Error {}

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

async function call(serverUrl: string, path: string, init: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api/qr/menu${path}`, {
      ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new RestroFuelError("We couldn’t reach your RestroFuel server. Make sure it is running and online, then try again.");
  }
  const text = await res.text();
  if (text.length > MAX_RESPONSE_BYTES) throw new RestroFuelError("Your RestroFuel menu is too large to import.");
  let body: { data?: unknown; message?: unknown } | null = null;
  try { body = JSON.parse(text); } catch { /* reported below */ }
  if (res.status === 401) {
    throw new RestroFuelError(typeof body?.message === "string" ? body.message : "RestroFuel no longer recognises this connection. Connect again from RestroFuel.");
  }
  if (!res.ok || !body) throw new RestroFuelError("Your RestroFuel server couldn’t answer. Please try again.");
  return body.data;
}

const bearer = (secret: string) => ({ Authorization: `Bearer ${secret}` });

const redeemed = z.object({ linkId: z.uuid(), secret: z.string().min(32).max(200), license: z.string().nullable() });

export async function redeemConnectCode(serverUrl: string, code: string, qrRestaurantId: string) {
  const data = await call(serverUrl, "/link", { method: "POST", body: JSON.stringify({ code, qrRestaurantId }) });
  const parsed = redeemed.safeParse(data);
  if (!parsed.success) throw new RestroFuelError("Your RestroFuel server sent an unexpected reply. Update RestroFuel and try again.");
  return parsed.data;
}

const pulled = z.object({ snapshot: z.unknown(), license: z.string().nullable() });

export async function fetchMenu(serverUrl: string, secret: string) {
  const data = pulled.safeParse(await call(serverUrl, "", { method: "GET", headers: bearer(secret) }));
  const snapshot = data.success ? snapshotSchema.safeParse(data.data.snapshot) : null;
  if (!data.success || !snapshot?.success) throw new RestroFuelError("Your RestroFuel menu couldn’t be read. Update RestroFuel and try again.");
  return { snapshot: snapshot.data, license: data.data.license };
}

export async function unlink(serverUrl: string, secret: string) {
  await call(serverUrl, "/link", { method: "DELETE", headers: bearer(secret) });
}
