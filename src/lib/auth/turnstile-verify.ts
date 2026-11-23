import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Verifies a Turnstile token. With no secret configured the check is skipped and rate limits remain the safeguard. */
export async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
      body: new URLSearchParams({ secret, response: token, ...(ip !== "unknown" ? { remoteip: ip } : {}) }),
    });
    return response.ok && (await response.json()).success === true;
  } catch {
    console.error("Turnstile verification unavailable");
    return false;
  }
}
