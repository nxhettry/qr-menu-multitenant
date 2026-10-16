export function formatPrice(priceMinor: number) {
  return `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(priceMinor / 100)}`;
}

export function safeMapUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function phoneHref(value: string | null) {
  if (!value || !/^\+?[\d\s().-]{5,30}$/.test(value)) return null;
  const number = value.replace(/[\s().-]/g, "");
  return /^\+?\d{5,15}$/.test(number) ? `tel:${number}` : null;
}

export function accessibleAccent(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return "#9a3412";
  let channels = [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
  const luminance = (rgb: number[]) => rgb.reduce((sum, channel, index) => {
    const srgb = channel / 255;
    return sum + (srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  const background = luminance([250, 248, 242]);
  while ((background + 0.05) / (luminance(channels) + 0.05) < 4.5) {
    channels = channels.map(channel => Math.floor(channel * 0.9));
  }
  return `#${channels.map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function cloudinaryImageUrl(cloudName: string | undefined, publicId: string | null, version: number | null, width: number, height: number) {
  if (!cloudName || !/^[a-z0-9_-]+$/i.test(cloudName) || !publicId || !version || !Number.isSafeInteger(version) || version < 1) return null;
  const parts = publicId.split("/");
  if (parts.some(part => !/^[a-z0-9_-]+$/i.test(part)) || ![96, 192, 320, 640, 1280].includes(width)) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${height}/v${version}/${parts.map(encodeURIComponent).join("/")}`;
}

export function openingHoursEntries(hours: Record<string, unknown>) {
  return Object.entries(hours).filter((entry): entry is [string, string] =>
    entry[0].length <= 40 && typeof entry[1] === "string" && entry[1].length <= 100,
  ).slice(0, 14);
}
