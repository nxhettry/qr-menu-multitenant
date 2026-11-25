import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Link secrets at rest (AES-256-GCM) and the signature on calls from a RestroFuel server. */

const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;

export function encryptSecret(secret: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map(part => typeof part === "string" ? part : part.toString("base64url")).join(".");
}

export function decryptSecret(value: string, key: Buffer) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unreadable link secret");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** hex HMAC-SHA256(secret, `${timestamp}.${body}`), within five minutes of now. */
export function verifySignature(secret: string, timestamp: string | null, body: string, signature: string | null, now = Date.now()) {
  if (!timestamp || !signature || !/^\d{1,15}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  if (Math.abs(now - Number(timestamp)) > SIGNATURE_WINDOW_MS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
