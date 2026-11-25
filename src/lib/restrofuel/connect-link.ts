import { parseServerUrl, type RestroFuelServer } from "./server-url.ts";

/** `/connect/restrofuel?server=…&code=…`, the address RestroFuel opens to connect a QR menu. */

export const CONNECT_PATH = "/connect/restrofuel";
const CODE = /^[A-Za-z0-9_-]{20,100}$/;

export type ConnectLink = { server: RestroFuelServer; code: string };

export function parseConnectParams(server: unknown, code: unknown): ConnectLink | null {
  const parsed = parseServerUrl(server);
  return parsed && typeof code === "string" && CODE.test(code) ? { server: parsed, code } : null;
}

export const connectPath = ({ server, code }: ConnectLink) =>
  `${CONNECT_PATH}?${new URLSearchParams({ server: server.url, code })}`;

/** A connect path rebuilt from its parts, or null; safe to redirect to. */
export function safeConnectPath(value: string) {
  if (!value.startsWith(`${CONNECT_PATH}?`)) return null;
  const url = new URL(value, "https://placeholder.invalid");
  if (url.pathname !== CONNECT_PATH || [...url.searchParams.keys()].length !== 2) return null;
  const link = parseConnectParams(url.searchParams.get("server"), url.searchParams.get("code"));
  return link ? connectPath(link) : null;
}
