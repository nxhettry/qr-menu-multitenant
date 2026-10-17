import type { DisplayField, ItemDetails } from "./details";

export function fieldVisible(details: ItemDetails | undefined, field: DisplayField) {
  return !details?.hidden_fields.includes(field);
}
