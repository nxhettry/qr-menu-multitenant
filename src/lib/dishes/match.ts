import type { ImportEntry } from "../editor/import.ts";
import type { CatalogDish } from "./schemas.ts";
import { exactDish, nearMissDish, type DishIndex } from "./search.ts";

export type DishMatch = { kind: "exact" | "near"; dish: CatalogDish } | null;
export type DishChoice = "use" | "keep";

export function matchDish(index: DishIndex, name: string): DishMatch {
  const exact = exactDish(index, name);
  if (exact) return { kind: "exact", dish: exact };
  const near = nearMissDish(index, name);
  return near ? { kind: "near", dish: near } : null;
}

/** Applies the owner's choice: exact names link silently, near misses only change when the owner accepts. */
export function applyDishMatch(entry: ImportEntry, match: DishMatch, choice?: DishChoice): ImportEntry {
  if (!match || (match.kind === "near" && choice !== "use")) return entry;
  const { dish } = match;
  const name_ne = entry.item.name_ne || (match.kind === "near" ? dish.nameNe : null);
  return { ...entry, item: { ...entry.item, dish_id: dish.id, ...(match.kind === "near" ? { name: dish.name, name_ne } : {}) } };
}
