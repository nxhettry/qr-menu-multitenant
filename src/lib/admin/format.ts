const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Kathmandu" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" });
const numberFormat = new Intl.NumberFormat("en-IN");

export const formatDate = (value: string | null) => value ? dateFormat.format(new Date(value)) : "—";
export const formatDateTime = (value: string | null) => value ? dateTimeFormat.format(new Date(value)) : "—";
export const formatCount = (value: number) => numberFormat.format(value);
export const isBanned = (bannedUntil: string | null) => Boolean(bannedUntil && Date.parse(bannedUntil) > Date.now());

const actionLabels: Record<string, string> = {
  "restaurant.created": "Restaurant created",
  "admin.restaurant.suspended": "Suspended by admin",
  "admin.restaurant.restored": "Restored by admin",
  "admin.user.password_set": "Password set by admin",
  "admin.user.banned": "Sign-in disabled by admin",
  "admin.user.unbanned": "Sign-in enabled by admin",
  "admin.user.reset_sent": "Reset email sent by admin",
  "menu.importItems": "Menu items imported",
};

export function eventLabel(action: string) {
  return actionLabels[action] ?? (action.startsWith("menu.") ? `Menu: ${action.slice(5).replace(/([A-Z])/g, " $1").toLowerCase()}` : action);
}
