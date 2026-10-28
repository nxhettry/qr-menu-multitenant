export const reservedSlugs = new Set([
  "dashboard", "login", "register", "api", "q", "admin", "settings", "pricing",
  "about", "help", "terms", "privacy", "setup", "auth", "onboarding",
  "forgot-password", "reset-password", "robots", "sitemap", "www", "momo-house",
]);

export function isRestaurantSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(value) && !reservedSlugs.has(value);
}

/** Builds a valid menu address from a restaurant name; returns "" when the name has no Latin letters or digits. */
export function suggestSlug(name: string) {
  const base = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  if (!base) return "";
  const slug = base.length < 3 ? `${base}-menu` : base;
  return isRestaurantSlug(slug) ? slug : `${slug.slice(0, 35).replace(/-+$/, "")}-menu`;
}
