"use client";
import { memo } from "react";
import { useWatch, type Control, type FieldPath } from "react-hook-form";
import { parsePrice } from "@/lib/editor/schemas";
import { formatPrice, guestPrice } from "@/lib/menu/presentation";
import type { VatRule } from "@/lib/menu/vat";
import { Hint } from "@/components/ui/form";
import type { ItemFields } from "./item-form-values";

export const showsGuestPrice = (vat: VatRule) => !vat.pricesIncludeVat && vat.vatPercent > 0;

export const GuestPriceHint = memo(function GuestPriceHint({ control, name, vat }: { control: Control<ItemFields>; name: FieldPath<ItemFields>; vat: VatRule }) {
  const value = useWatch({ control, name });
  if (!showsGuestPrice(vat) || typeof value !== "string") return null;
  try { return <Hint>Guests pay {formatPrice(guestPrice(parsePrice(value), vat))} (includes {vat.vatPercent}% VAT)</Hint>; }
  catch { return null; }
});
