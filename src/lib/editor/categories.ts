import type { EditorCategory } from "./data";

export function categoryLabel(category: EditorCategory, categories: EditorCategory[]) {
  const parent = categories.find(entry => entry.id === category.parent_id);
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

export function orderedCategories(categories: EditorCategory[]) {
  return categories.filter(category => !category.parent_id).flatMap(parent => [parent, ...categories.filter(category => category.parent_id === parent.id)]);
}
