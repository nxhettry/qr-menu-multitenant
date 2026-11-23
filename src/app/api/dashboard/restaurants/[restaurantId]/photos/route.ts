import { z } from "zod";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { listPhotoOptions } from "@/lib/media/repository";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    const context = await getTenantContext((await params).restaurantId);
    const itemId = z.uuid().safeParse(new URL(request.url).searchParams.get("itemId"));
    if (!itemId.success) return Response.json({ error: "Choose an item." }, { status: 400, headers });
    return Response.json(await listPhotoOptions(context, itemId.data), { headers });
  } catch (error) {
    if (error instanceof TenantAccessError) return Response.json({ error: error.message }, { status: error.status, headers });
    return Response.json({ error: "Could not load photos" }, { status: 503, headers });
  }
}
