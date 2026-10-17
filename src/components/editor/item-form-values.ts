import type { DisplayField } from "@/lib/menu/details";

export type ItemFields = {
  category_id: string; name: string; name_ne: string; description: string; description_ne: string;
  price: string; uses_variants: boolean; is_available: boolean; is_visible: boolean; is_featured: boolean;
  diet: string; spice_level: string; confirm_prices: boolean;
  variants: { name: string; name_ne: string; price: string; is_available: boolean }[];
  is_popular: boolean; is_new: boolean; tags: string; allergens: string; allergen_notes: string;
  preparation_minutes: string; calories: string; hidden_fields: DisplayField[];
  addon_groups: { name: string; min_select: number; max_select: number; options: { name: string; price: string; is_available: boolean }[] }[];
};
