import "server-only";
import QRCode from "qrcode";

const options = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#111111", light: "#ffffff" } };

/** Printed QR codes always use the immutable short code, so renames never break them. */
export function menuQrUrl(origin: string, shortCode: string) {
  return `${origin}/q/${shortCode}`;
}

export function qrSvg(url: string) {
  return QRCode.toString(url, { ...options, type: "svg" });
}

export function qrPng(url: string) {
  return QRCode.toBuffer(url, { ...options, type: "png", width: 1200 });
}
