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
