import { z } from "zod";

export const displayFields = {
  photos: "Item photos", description: "Descriptions", nepali: "Nepali names & descriptions",
  diet: "Veg / non-veg labels", spice: "Spice level", preparation: "Preparation time",
  calories: "Calories", tags: "Tags", badges: "Popular, new & special badges",
  allergens: "Allergen information", addons: "Add-ons",
} as const;
export type DisplayField = keyof typeof displayFields;
export const displayFieldSchema = z.enum(Object.keys(displayFields) as [DisplayField, ...DisplayField[]]);
const label = z.string().trim().min(1).max(60);
export const addonGroupSchema = z.object({
  name: label, min_select: z.number().int().min(0).max(20), max_select: z.number().int().min(1).max(20),
  options: z.array(z.object({ name: label, price_minor: z.number().int().min(0).max(1000000000), is_available: z.boolean() })).min(1).max(20),
}).refine(group => group.min_select <= group.max_select && group.max_select <= group.options.length, { message: "Add-on selection limits must fit the number of options." });
export const itemDetailsSchema = z.object({
  is_popular: z.boolean().default(false), is_new: z.boolean().default(false),
  tags: z.array(label).max(10).default([]), allergens: z.array(label).max(20).default([]),
  allergen_notes: z.string().trim().max(500).nullable().default(null),
  preparation_minutes: z.number().int().min(1).max(1440).nullable().default(null),
  calories: z.number().int().min(0).max(100000).nullable().default(null),
  addon_groups: z.array(addonGroupSchema).max(10).default([]),
  hidden_fields: z.array(displayFieldSchema).max(11).default([]),
});
export type ItemDetails = z.infer<typeof itemDetailsSchema>;

export function publicDetails(details: ItemDetails | undefined): ItemDetails {
  const value = itemDetailsSchema.parse(details ?? {});
  const visible = (field: DisplayField) => !value.hidden_fields.includes(field);
  return { ...value, is_popular: visible("badges") && value.is_popular, is_new: visible("badges") && value.is_new,
    tags: visible("tags") ? value.tags : [], allergens: visible("allergens") ? value.allergens : [],
    allergen_notes: visible("allergens") ? value.allergen_notes : null,
    preparation_minutes: visible("preparation") ? value.preparation_minutes : null,
    calories: visible("calories") ? value.calories : null,
    addon_groups: visible("addons") ? value.addon_groups : [],
  };
}
