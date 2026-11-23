import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";
import { RATE_LIMIT_POLICIES, type RateLimitPolicy } from "./policies";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfter: number };

export const RATE_LIMITED_MESSAGE = "Too many attempts. Please wait a moment and try again.";

export async function getClientIp() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-real-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

/** Counts one attempt. Fails open when the limiter is unreachable so an outage never locks owners out. */
export async function checkRateLimit(policy: RateLimitPolicy, identity: string): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMIT_POLICIES[policy];
  try {
    const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
      p_key: `${policy}:${identity}`.slice(0, 200), p_limit: limit, p_window_seconds: windowSeconds,
    });
    if (error || typeof data !== "number") throw new Error(error?.code ?? "unexpected response");
    return data === 0 ? { allowed: true } : { allowed: false, retryAfter: data };
  } catch (error) {
    console.error("Rate limiter unavailable", { policy, reason: error instanceof Error ? error.message : "unknown" });
    return { allowed: true };
  }
}

export async function checkRateLimitByIp(policy: RateLimitPolicy) {
  return checkRateLimit(policy, await getClientIp());
}

export function rateLimitedResponse(retryAfter: number, headersInit: HeadersInit = {}) {
  return Response.json({ error: RATE_LIMITED_MESSAGE }, { status: 429, headers: { ...headersInit, "Retry-After": String(retryAfter) } });
}
