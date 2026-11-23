import { getVerifiedUser } from "@/lib/auth/session";
import { exportAccountData } from "@/lib/account/repository";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const user = await getVerifiedUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  const limit = await checkRateLimit("accountExport", user.id);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfter, headers);
  try {
    return new Response(JSON.stringify(await exportAccountData(), null, 2), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="qr-menu-account-data.json"' },
    });
  } catch {
    return Response.json({ error: "We couldn’t prepare your data. Please try again." }, { status: 503, headers });
  }
}
