import type { PublishedMenu, MenuItem } from "./schema";

export function searchableText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function itemAvailable(item: MenuItem) {
  return item.isAvailable && (!item.variants.length || item.variants.some(variant => variant.isAvailable));
}

export function indexMenu(categories: PublishedMenu["categories"]) {
  return categories.map(category => ({ category, items: category.items.map(item => ({ item,
    text: searchableText([category.name, category.nameNe, item.subcategory, ...(item.details?.tags ?? []), item.name, item.nameNe, item.description, item.descriptionNe,
      ...item.variants.flatMap(variant => [variant.name, variant.nameNe])].filter(Boolean).join(" ")),
  })) }));
}

export function filterMenu(index: ReturnType<typeof indexMenu>, query: string, selection: string, subcategory = "") {
  const tokens = searchableText(query).split(" ").filter(Boolean);
  return index.filter(({ category }) => selection === "all" || selection === "specials" || category.id === selection)
    .map(({ category, items }) => ({ ...category, items: items.filter(({ item, text }) =>
      (selection !== "specials" || item.isFeatured) && (!subcategory || item.subcategory === subcategory) && tokens.every(token => text.includes(token)),
    ).map(({ item }) => item) })).filter(category => category.items.length > 0);
}
