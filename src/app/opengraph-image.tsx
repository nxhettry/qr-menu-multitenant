import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#fafaf9", color: "#1a1714" }}>
      <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#c2410c" }}>{SITE_NAME} · RestroFuel</div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>Your menu, one scan away.</div>
      <div style={{ display: "flex", marginTop: 32, fontSize: 36, color: "#57514b" }}>{SITE_TAGLINE}</div>
    </div>,
    size,
  );
}
