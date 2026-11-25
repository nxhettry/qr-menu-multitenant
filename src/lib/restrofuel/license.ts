import { createPublicKey, verify, type KeyObject } from "node:crypto";

/**
 * Fleet's signed license, sent by the restaurant server with every reply.
 * `base64url(JSON payload) + "." + base64url(Ed25519 signature)`; same keys as
 * RestroFuelVat server/src/license/license-keys.ts.
 */

const FLEET_PUBLIC_KEYS: Readonly<Record<string, string>> = {
  k1: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAfVWAzbq4ATqKSydOAdp8y39f5s+CSQM2/pnxp7cqReE=\n-----END PUBLIC KEY-----",
};
const ACTIVE_STATES = new Set(["pilot", "active", "expiring", "extended"]);

export type LicenseCheck =
  | { ok: true; slug: string; state: string }
  | { ok: false; slug: string | null; state: string; reason: "invalid" | "other_restaurant" | "inactive" };

type PublicKeys = Readonly<Record<string, string>>;
const keyCache = new Map<string, KeyObject>();
function keyFor(kid: unknown, keys: PublicKeys) {
  if (typeof kid !== "string" || !Object.hasOwn(keys, kid)) return null;
  let key = keyCache.get(keys[kid]);
  if (!key) keyCache.set(keys[kid], (key = createPublicKey(keys[kid])));
  return key;
}

type Payload = { kid?: unknown; slug?: unknown; state?: unknown; suspended?: unknown; leaseUntil?: unknown };

function readPayload(token: unknown, keys: PublicKeys): Payload | null {
  if (typeof token !== "string" || token.length > 8192) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    const key = keyFor(payload?.kid, keys);
    return key && verify(null, Buffer.from(body, "ascii"), key, Buffer.from(signature, "base64url")) ? payload : null;
  } catch {
    return null;
  }
}

/** Fleet signed it, for the restaurant behind `tenantSlug`, and it allows syncing now. */
export function checkLicense(token: unknown, tenantSlug: string, now = Date.now(), keys: PublicKeys = FLEET_PUBLIC_KEYS): LicenseCheck {
  const payload = readPayload(token, keys);
  if (!payload || typeof payload.slug !== "string" || typeof payload.state !== "string") {
    return { ok: false, slug: null, state: "invalid", reason: "invalid" };
  }
  const { slug, state } = payload;
  if (slug !== tenantSlug) return { ok: false, slug, state, reason: "other_restaurant" };
  const leaseOk = typeof payload.leaseUntil === "string" && Date.parse(payload.leaseUntil) > now;
  if (!ACTIVE_STATES.has(state) || payload.suspended === true || !leaseOk) return { ok: false, slug, state, reason: "inactive" };
  return { ok: true, slug, state };
}
