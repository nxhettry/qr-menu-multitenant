import type { EditorData } from "./data";
import type { PublishedMenu } from "../menu/schema";

export function previewMenu(data: EditorData): PublishedMenu {
  const r = data.restaurant;
  return {
    id: r.id, status: "PUBLISHED", name: r.name, nameNe: r.name_ne, slug: r.slug, shortCode: r.short_code,
    description: r.description, phone: r.phone, address: r.address, mapUrl: r.map_url, themeColor: r.theme_color,
    logoPublicId: r.logo_public_id, logoVersion: r.logo_version, coverPublicId: r.cover_public_id, coverVersion: r.cover_version,
    openingHours: r.opening_hours, currency: "NPR", pricesIncludeVat: r.prices_include_vat,
    vatPercent: r.vat_percent, serviceChargePercent: r.service_charge_percent, updatedAt: r.updated_at,
    categories: data.categories.filter(category => category.is_visible).map(category => ({
      id: category.id, name: category.name, nameNe: category.name_ne,
      items: category.items.map(item => ({
        id: item.id, name: item.name, nameNe: item.name_ne, description: item.description, descriptionNe: item.description_ne,
        priceMinor: item.price_minor, imagePublicId: item.image_public_id, imageVersion: item.image_version,
        isAvailable: item.is_available, isFeatured: item.is_featured, diet: item.diet, spiceLevel: item.spice_level,
        variants: item.variants.map(variant => ({ id: variant.id, name: variant.name, nameNe: variant.name_ne, priceMinor: variant.price_minor, isAvailable: variant.is_available })),
      })),
    })),
  };
}
