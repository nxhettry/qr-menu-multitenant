/** Mirrors private.normalize_dish_name in the 202611010001 migration; scripts/test-dishes.mjs keeps them identical. */
export function normalizeDishName(name: string | null | undefined) {
  return (name ?? "").toLowerCase()
    .replace(/[-_/&,+]/g, " ")
    .replace(/[!-/:-@[-`{-~’‘“”–—।]/g, "")
    .replace(/\b(half|full|small|medium|large|regular)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function dishSearchKeys(name: string, nameNe: string | null | undefined, aliases: readonly string[]) {
  return [...new Set([name, nameNe, ...aliases].map(normalizeDishName).filter(Boolean))].sort();
}
