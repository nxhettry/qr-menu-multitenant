import { safeConnectPath } from "../restrofuel/connect-link.ts";

const destinations = new Set(["/dashboard", "/onboarding", "/reset-password"]);
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  return destinations.has(value) ? value : safeConnectPath(value) ?? fallback;
}
