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
