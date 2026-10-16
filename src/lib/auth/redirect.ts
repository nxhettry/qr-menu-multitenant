const destinations = new Set(["/dashboard", "/onboarding", "/reset-password"]);
export function safeNextPath(value: string | null | undefined) {
  return value && destinations.has(value) ? value : "/dashboard";
}
