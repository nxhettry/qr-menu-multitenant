export type VatRule = { pricesIncludeVat: boolean; vatPercent: number };

export const MAX_PRICE_MINOR = 1000000000;
const RATE_BASE = 10000;

const roundHalfUp = (numerator: number, denominator: number) => Math.floor((2 * numerator + denominator) / (2 * denominator));

/** Converts a stored price between VAT modes, rounded to whole rupees. Mirrors `private.convert_vat_price`. */
export function convertVatPrice(priceMinor: number, vatPercent: number, toInclusive: boolean) {
  if (priceMinor === 0) return 0;
  const rate = RATE_BASE + Math.round(vatPercent * 100);
  const rupees = toInclusive ? roundHalfUp(priceMinor * rate, RATE_BASE * 100) : roundHalfUp(priceMinor * RATE_BASE, rate * 100);
  return rupees * 100;
}

export function guestPrice(priceMinor: number, rule: VatRule) {
  return rule.pricesIncludeVat || rule.vatPercent <= 0 ? priceMinor : convertVatPrice(priceMinor, rule.vatPercent, true);
}
