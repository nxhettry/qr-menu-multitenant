export const starterTemplates = [
  { slug: "momo-fast-food", label: "Momo & fast food", description: "Momo, noodles, burgers, snacks and drinks" },
  { slug: "cafe", label: "Café", description: "Coffee, tea, shakes, bakery and light bites" },
  { slug: "nepali-thali", label: "Nepali thali", description: "Dal bhat sets, curries, Newari snacks and sweets" },
  { slug: "bar-restaurant", label: "Bar & restaurant", description: "Starters, mains, tandoor, rice, bread and drinks" },
] as const;

export type StarterTemplateSlug = typeof starterTemplates[number]["slug"];
export const starterTemplateHref = (slug: StarterTemplateSlug, format: "xlsx" | "csv") => `/templates/menu-starter-${slug}.${format}`;
