import { handleServerEvent, RestroFuelError, SignatureError } from "@/lib/restrofuel/service";
import { checkRateLimitByIp, rateLimitedResponse } from "@/lib/rate-limit";

const headers = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 4096;

/** Signed calls from a RestroFuel server: POST /api/integrations/restrofuel/sync | disconnect. */
export async function POST(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  if (event !== "sync" && event !== "disconnect") return Response.json({ error: "Not found" }, { status: 404, headers });
  const limit = await checkRateLimitByIp("restrofuelEvent");
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfter, headers);
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return Response.json({ error: "Request too large" }, { status: 413, headers });
  try {
    return Response.json({ data: await handleServerEvent(event, request.headers, body) }, { headers });
  } catch (error) {
    if (error instanceof SignatureError) return Response.json({ error: "This QR menu connection is not recognised. Connect again." }, { status: 401, headers });
    if (error instanceof RestroFuelError) return Response.json({ error: error.message }, { status: 409, headers });
    console.error("RestroFuel event failed", { event });
    return Response.json({ error: "The QR menu couldn’t complete the sync. Please try again." }, { status: 503, headers });
  }
}
