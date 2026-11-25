import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { getSyncStatus } from "@/lib/restrofuel/service";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    const context = await getTenantContext((await params).restaurantId);
    return Response.json(await getSyncStatus(context), { headers });
  } catch (error) {
    if (error instanceof TenantAccessError) return Response.json({ error: error.message }, { status: error.status, headers });
    return Response.json({ error: "We couldn’t load the RestroFuel status." }, { status: 503, headers });
  }
}
