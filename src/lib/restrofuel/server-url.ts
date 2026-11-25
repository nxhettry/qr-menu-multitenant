/**
 * RestroFuel servers are reached only through their cloudflared tunnel,
 * `https://<tenant>.kree.com.np`. Anything else is refused, so a connect link
 * can't point this app at an arbitrary address.
 */
const TUNNEL_HOST = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.kree\.com\.np$/;

export type RestroFuelServer = { url: string; tenantSlug: string };

export function parseServerUrl(value: unknown): RestroFuelServer | null {
  if (typeof value !== "string" || value.length > 255) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const match = TUNNEL_HOST.exec(url.hostname);
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.search || url.hash || !match) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  return { url: `https://${url.hostname}`, tenantSlug: match[1] };
}
