import type { EditorCategory } from "./data";
import { MAX_PRICE_MINOR, convertVatPrice, guestPrice } from "../menu/vat.ts";

export type VatConversionRow = { label: string; from: number; to: number };
export type VatConversionPlan = { rows: VatConversionRow[]; changed: number; overflow: boolean };
export type VatConversionStrategy = "convert" | "keep";

function* pricedEntries(categories: EditorCategory[]) {
  for (const category of categories) {
    for (const item of category.items) {
      if (item.price_minor) yield { label: item.name, price: item.price_minor };
      for (const variant of item.variants) if (variant.price_minor) yield { label: `${item.name} · ${variant.name}`, price: variant.price_minor };
      for (const group of item.details.addon_groups) {
        for (const option of group.options) if (option.price_minor) yield { label: `${item.name} · ${option.name}`, price: option.price_minor };
      }
    }
  }
}

/**
 * Previews what changing the VAT mode does. "convert" rewrites stored prices so guests pay the same;
 * "keep" leaves stored prices alone and shows how the guest price moves.
 */
export function planVatConversion(categories: EditorCategory[], vatPercent: number, toInclusive: boolean, strategy: VatConversionStrategy): VatConversionPlan {
  const before = { pricesIncludeVat: !toInclusive, vatPercent };
  const rows: VatConversionRow[] = [];
  let changed = 0;
  let overflow = false;
  for (const { label, price } of pricedEntries(categories)) {
    const row = strategy === "convert"
      ? { label, from: price, to: convertVatPrice(price, vatPercent, toInclusive) }
      : { label, from: guestPrice(price, before), to: guestPrice(price, { pricesIncludeVat: toInclusive, vatPercent }) };
    if (row.from === row.to) continue;
    changed += 1;
    overflow ||= strategy === "convert" && row.to > MAX_PRICE_MINOR;
    rows.push(row);
  }
  return { rows, changed, overflow };
}
