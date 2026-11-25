import "server-only";
import { z } from "zod";

export function getSiteOrigin() {
  const url = new URL(z.url().parse(process.env.NEXT_PUBLIC_SITE_URL));
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== "https:" && !localHttp)) {
    throw new Error("Configure an HTTPS application site URL, or HTTP localhost for development");
  }
  return url.origin;
}

export function getSupabaseSecretKey() {
  return z.string().min(1).refine(value => {
    if (value.startsWith("sb_secret_")) return true;
    try { return JSON.parse(atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role"; }
    catch { return false; }
  }, "Use the Supabase secret (service role) key").parse(process.env.SUPABASE_SECRET_KEY);
}

/** 32-byte key (base64) that encrypts RestroFuel link secrets at rest. */
export function getRestroFuelLinkKey() {
  const key = Buffer.from(z.string().min(1, "Set RESTROFUEL_LINK_KEY").parse(process.env.RESTROFUEL_LINK_KEY), "base64");
  if (key.length !== 32) throw new Error("RESTROFUEL_LINK_KEY must be 32 bytes, base64 encoded");
  return key;
}
