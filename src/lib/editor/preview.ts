import type { EditorData } from "./data";
import type { PublishedMenu } from "../menu/schema";
import { publicDetails } from "../menu/details.ts";
import { fieldVisible } from "../menu/visibility.ts";

export function previewMenu(data: EditorData): PublishedMenu {
  const r = data.restaurant;
  return {
    id: r.id, status: "PUBLISHED", name: r.name, nameNe: r.hidden_fields.includes("nepali") ? null : r.name_ne, slug: r.slug, shortCode: r.short_code,
    description: r.description, phone: r.phone, address: r.address, mapUrl: r.map_url, themeColor: r.theme_color,
    logoPublicId: r.logo_public_id, logoVersion: r.logo_version, coverPublicId: r.cover_public_id, coverVersion: r.cover_version,
    openingHours: r.opening_hours, currency: "NPR", pricesIncludeVat: r.prices_include_vat,
    vatPercent: r.vat_percent, serviceChargePercent: r.service_charge_percent, updatedAt: r.updated_at,
    categories: data.categories.filter(category => !category.parent_id && category.is_visible).map(category => ({
      id: category.id, name: category.name, nameNe: r.hidden_fields.includes("nepali") ? null : category.name_ne,
      items: data.categories.filter(leaf => (leaf.id === category.id || leaf.parent_id === category.id) && leaf.is_visible).flatMap(leaf => leaf.items.filter(item => item.is_visible).map(item => {
        const details = publicDetails({ ...item.details, hidden_fields: [...new Set([...r.hidden_fields, ...item.details.hidden_fields])].sort() });
        const visible = (field: Parameters<typeof fieldVisible>[1]) => fieldVisible(details, field);
        return ({
        id: item.id, name: item.name, priceMinor: item.price_minor,
        isAvailable: item.is_available, isFeatured: item.is_featured,
        details, subcategory: leaf.parent_id ? leaf.name : null,
        variants: item.variants.map(variant => ({ id: variant.id, name: variant.name, nameNe: visible("nepali") ? variant.name_ne : null, priceMinor: variant.price_minor, isAvailable: variant.is_available })),
        nameNe: visible("nepali") ? item.name_ne : null, description: visible("description") ? item.description : null,
        descriptionNe: visible("description") && visible("nepali") ? item.description_ne : null,
        imagePublicId: visible("photos") ? item.image_public_id : null, imageVersion: visible("photos") ? item.image_version : null,
        diet: visible("diet") ? item.diet : null, spiceLevel: visible("spice") ? item.spice_level : null,
      }); })),
    })),
  };
}
