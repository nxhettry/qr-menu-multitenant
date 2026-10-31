import { dishSearchKeys, normalizeDishName } from "./normalize.ts";
import type { CatalogDish } from "./schemas.ts";

export type DishIndexEntry = { dish: CatalogDish; keys: string[]; trigrams: Set<string>[] };
export type DishIndex = { entries: DishIndexEntry[]; byKey: Map<string, CatalogDish[]>; byId: Map<string, CatalogDish> };

export const SUGGESTION_LIMIT = 6;
export const NEAR_MISS_THRESHOLD = 0.55;

export function trigrams(value: string) {
  const grams = new Set<string>();
  for (const word of value.split(" ").filter(Boolean)) {
    const padded = `  ${word} `;
    for (let index = 0; index < padded.length - 2; index += 1) grams.add(padded.slice(index, index + 3));
  }
  return grams;
}

export function similarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;
  return shared / (left.size + right.size - shared);
}

export function buildDishIndex(catalog: readonly CatalogDish[]): DishIndex {
  const byKey = new Map<string, CatalogDish[]>();
  const entries = catalog.map(dish => {
    const keys = dishSearchKeys(dish.name, dish.nameNe, dish.aliases);
    for (const key of keys) byKey.set(key, [...(byKey.get(key) ?? []), dish]);
    return { dish, keys, trigrams: keys.map(trigrams) };
  });
  return { entries, byKey, byId: new Map(catalog.map(dish => [dish.id, dish])) };
}

/** The dish whose name or alias equals the normalised text, only when that is unambiguous. */
export function exactDish(index: DishIndex, text: string) {
  const matches = index.byKey.get(normalizeDishName(text));
  return matches?.length === 1 ? matches[0] : null;
}

const startsAnyWord = (words: string[], token: string) => words.some(word => word.startsWith(token));

function rank(entry: DishIndexEntry, query: string, queryGrams: Set<string>, tokens: string[]) {
  let best = Infinity;
  entry.keys.forEach((key, position) => {
    let score = Infinity;
    if (key === query) score = 0;
    else if (key.startsWith(query)) score = 1;
    else if (tokens.every(token => startsAnyWord(key.split(" "), token))) score = 2;
    else if (key.includes(query)) score = 3;
    else if (query.length >= 4) {
      const fuzzy = similarity(queryGrams, entry.trigrams[position]);
      if (fuzzy >= NEAR_MISS_THRESHOLD) score = 4 + (1 - fuzzy);
    }
    if (score < best) best = score;
  });
  return best;
}

export function suggestDishes(index: DishIndex, text: string, limit = SUGGESTION_LIMIT) {
  const query = normalizeDishName(text);
  if (query.length < 2) return [];
  const queryGrams = trigrams(query);
  const tokens = query.split(" ");
  return index.entries
    .map(entry => ({ dish: entry.dish, score: rank(entry, query, queryGrams, tokens) }))
    .filter(match => match.score < Infinity)
    .sort((a, b) => a.score - b.score || a.dish.name.length - b.dish.name.length || a.dish.name.localeCompare(b.dish.name))
    .slice(0, limit).map(match => match.dish);
}

/** A close but inexact match for "Did you mean…?": never returned when the text already names a dish. */
export function nearMissDish(index: DishIndex, text: string) {
  const query = normalizeDishName(text);
  if (query.length < 4 || index.byKey.has(query)) return null;
  const queryGrams = trigrams(query);
  let best: { dish: CatalogDish; score: number } | null = null;
  for (const entry of index.entries) {
    for (const grams of entry.trigrams) {
      const score = similarity(queryGrams, grams);
      if (score >= NEAR_MISS_THRESHOLD && (!best || score > best.score)) best = { dish: entry.dish, score };
    }
  }
  return best?.dish ?? null;
}

export function dishMatchesName(dish: Pick<CatalogDish, "name" | "nameNe" | "aliases">, name: string) {
  const key = normalizeDishName(name);
  return key !== "" && dishSearchKeys(dish.name, dish.nameNe, dish.aliases).includes(key);
}
