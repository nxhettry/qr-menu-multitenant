export const SITE_NAME = "QR Menu";
export const SITE_TAGLINE = "Free QR menu maker for restaurants in Nepal";
export const SITE_DESCRIPTION = "Create a free digital QR code menu for your restaurant, café or momo shop in minutes. Bilingual English and नेपाली, instant price updates, no app to install. Made in Nepal.";
export const SITE_KEYWORDS = [
  "QR menu Nepal", "digital menu Nepal", "free QR code menu", "restaurant menu QR code", "QR menu maker",
  "online food menu Nepal", "contactless menu", "Nepali menu", "restaurant menu Kathmandu", "café menu QR code",
  "digital menu for restaurants", "menu QR generator", "food menu online",
];

export function siteOrigin() {
  try { return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").origin; }
  catch { return "http://localhost:3000"; }
}

export const absoluteUrl = (path = "/") => new URL(path, siteOrigin()).toString();

export const privateMetadata = (title: string) => ({ title, robots: { index: false, follow: false } });
