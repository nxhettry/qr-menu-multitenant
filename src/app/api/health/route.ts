export async function GET() {
  return Response.json({ status: "ready" }, { headers: { "Cache-Control": "private, no-store" } });
}
