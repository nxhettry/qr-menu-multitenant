export const reservedSlugs = new Set([
  "dashboard", "login", "register", "api", "q", "admin", "settings", "pricing",
  "about", "help", "terms", "privacy", "setup", "auth", "onboarding",
  "forgot-password", "reset-password", "robots", "sitemap", "www", "momo-house",
]);

export function isRestaurantSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(value) && !reservedSlugs.has(value);
}
