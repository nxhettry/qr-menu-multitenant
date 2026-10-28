import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { getRestaurantLink } from "@/lib/editor/repository";
import { getSiteOrigin } from "@/lib/env/server";
import { menuQrUrl, qrPng, qrSvg } from "@/lib/menu/qr";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  const query = new URL(request.url).searchParams;
  const format = query.get("format") === "png" ? "png" : "svg";
  try {
    const link = await getRestaurantLink(await getTenantContext((await params).restaurantId));
    const url = menuQrUrl(getSiteOrigin(), link.short_code);
    const headers = new Headers(privateHeaders);
    headers.set("Content-Type", format === "png" ? "image/png" : "image/svg+xml; charset=utf-8");
    if (query.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="${link.slug}-qr.${format}"`);
    return new Response(format === "png" ? new Uint8Array(await qrPng(url)) : await qrSvg(url), { headers });
  } catch (error) {
    if (error instanceof TenantAccessError) return Response.json({ error: error.message }, { status: error.status, headers: privateHeaders });
    return Response.json({ error: "We couldn’t create your QR code." }, { status: 503, headers: privateHeaders });
  }
}
