import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { getEditorData } from "@/lib/editor/repository";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
export async function GET(_request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    const context = await getTenantContext((await params).restaurantId);
    const menu = await getEditorData(context);
    return Response.json(menu, { headers });
  } catch (error) {
    if (error instanceof TenantAccessError) return Response.json({ error: error.message }, { status: error.status, headers });
    return Response.json({ error: "We couldn’t load your menu." }, { status: 503, headers });
  }
}
