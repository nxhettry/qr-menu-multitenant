import { editorMutation, itemInput, parsePrice } from "./schemas.ts";
import type { EditorCategory } from "./data.ts";
import type { ItemInput } from "./schemas.ts";
import { itemDetailsSchema } from "../menu/details.ts";

export const MAX_IMPORT_BYTES = 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;
export const importColumns = ["category", "subcategory", "name", "name_ne", "description", "description_ne", "variant", "variant_ne", "price", "type", "available", "variant_available", "visible", "popular", "new", "featured", "tags", "prep_minutes", "calories", "spice", "allergens", "allergen_notes", "addons", "hidden_fields"] as const;
export type ImportColumn = typeof importColumns[number];
export type ImportRecord = Partial<Record<ImportColumn, string>>;
export type ImportEntry = { category: string; subcategory: string; item: Omit<ItemInput, "id" | "category_id"> };
export type ImportIssue = { row: number; message: string };
export type ImportPreview = { items: ImportEntry[]; issues: ImportIssue[]; rowCount: number };
const key = (value: string) => value.normalize("NFKC").trim().toLowerCase();
const list = (value = "") => [...new Set(value.split("|").map(entry => entry.trim()).filter(Boolean))];
const diets: Record<string, "VEG" | "NON_VEG" | "EGG"> = { veg: "VEG", vegetarian: "VEG", nonveg: "NON_VEG", non_veg: "NON_VEG", non_vegetarian: "NON_VEG", egg: "EGG" };

function boolean(value: string | undefined, fallback: boolean) {
  if (!value?.trim()) return fallback;
  if (["true", "yes", "1"].includes(key(value))) return true;
  if (["false", "no", "0"].includes(key(value))) return false;
  throw new Error(`Use TRUE or FALSE instead of “${value}”.`);
}

function integer(value: string | undefined) {
  if (!value?.trim()) return null;
  if (!/^\d+$/.test(value.trim())) throw new Error(`Use a whole number instead of “${value}”.`);
  return Number(value);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else value += char;
    } else if (char === '"' && value === "" && !closed) quoted = true;
    else if (char === "," || char === "\n" || char === "\r") {
      row.push(value); value = ""; closed = false;
      if (char !== ",") {
        if (char === "\r" && input[i + 1] === "\n") i++;
        rows.push(row); row = [];
        if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error("Use at most 1,000 spreadsheet rows per import.");
      }
    } else {
      if (closed || char === '"') throw new Error("Check CSV quoting near row " + (rows.length + 1) + ".");
      value += char;
    }
  }
  if (quoted) throw new Error("A quoted CSV cell is missing its closing quote.");
  if (value || row.length || closed) rows.push([...row, value]);
  return rows;
}

export function previewImport(table: string[][], categories: EditorCategory[] = []): ImportPreview {
  if (!table.length) throw new Error("Your sheet is empty. Start with the template.");
  if (table.length > MAX_IMPORT_ROWS + 1) throw new Error("Use at most 1,000 spreadsheet rows per import.");
  const headers = table[0].map(value => key(value));
  for (const name of ["category", "name", "price"]) if (!headers.includes(name)) throw new Error(`Missing the ${name} column. Use the downloadable template.`);
  if (new Set(headers).size !== headers.length || headers.some(name => !importColumns.includes(name as ImportColumn))) throw new Error("Use unique column names from the template; remove unsupported columns.");
  const groups = new Map<string, { entry: ImportEntry; rows: number[]; signature: string; variantKeys: Set<string> }>();
  const issues: ImportIssue[] = [];
  const existing = new Set(categories.flatMap(category => {
    const parent = categories.find(entry => entry.id === category.parent_id);
    return category.items.map(item => JSON.stringify([key(parent?.name ?? category.name), key(parent ? category.name : ""), key(item.name)]));
  }));
  let rowCount = 0;
  table.slice(1).forEach((cells, index) => {
    if (cells.every(cell => !cell.trim())) return;
    const row = index + 2;
    rowCount++;
    try {
      if (cells.length > headers.length) throw new Error("This row has more cells than the header.");
      const record = Object.fromEntries(headers.map((name, i) => [name, (cells[i] ?? "").trim()])) as ImportRecord;
      const category = record.category ?? "", subcategory = record.subcategory ?? "", name = record.name ?? "";
      if (!category || category.length > 100 || subcategory.length > 100 || !name) throw new Error("Enter a category and item name; category names must fit 100 characters.");
      const itemKey = JSON.stringify([key(category), key(subcategory), key(name)]);
      if (existing.has(itemKey)) throw new Error("This item already exists in this category. Remove it from the sheet or use a different name.");
      const type = key(record.type ?? "").replace(/[ -]/g, "_");
      const diet = diets[type] ?? null;
      if (type && !diet) throw new Error("Type must be Veg, Non-veg, Egg, or blank.");
      const details = itemDetailsSchema.parse({
        is_popular: boolean(record.popular, false), is_new: boolean(record.new, false),
        tags: list(record.tags), allergens: list(record.allergens), allergen_notes: record.allergen_notes || null,
        preparation_minutes: integer(record.prep_minutes), calories: integer(record.calories), hidden_fields: list(record.hidden_fields),
        addon_groups: record.addons ? [{ name: "Extras", min_select: 0, max_select: record.addons.split("|").length,
          options: record.addons.split("|").map(addon => {
            const separator = addon.lastIndexOf(":");
            if (separator < 1) throw new Error("Use add-ons like Extra achar:30|Cheese:50 (prices in rupees).");
            return { name: addon.slice(0, separator).trim(), price_minor: parsePrice(addon.slice(separator + 1)), is_available: true };
          }),
        }] : [],
      });
      const variantName = record.variant ?? "";
      const price = parsePrice(record.price ?? "");
      const item = itemInput.parse({ category_id: "00000000-0000-4000-8000-000000000000", name, name_ne: record.name_ne || null,
        description: record.description || null, description_ne: record.description_ne || null,
        price_minor: variantName ? null : price, variants: variantName ? [{ name: variantName, name_ne: record.variant_ne || null, price_minor: price, is_available: boolean(record.variant_available, true) }] : [],
        diet, is_available: boolean(record.available, true), is_visible: boolean(record.visible, true), is_featured: boolean(record.featured, false),
        spice_level: integer(record.spice), confirm_prices: true, details,
      });
      const { category_id: omittedCategory, ...importItem } = item;
      void omittedCategory;
      const signature = JSON.stringify({ ...importItem, price_minor: null, variants: [] });
      const group = groups.get(itemKey);
      if (group) {
        if (!variantName || group.entry.item.price_minor !== null) throw new Error("Repeated items need a distinct variant name on every row.");
        if (signature !== group.signature) throw new Error("Repeat the same item details on every variant row; only variant, variant_ne, price and variant_available may differ.");
        if (group.variantKeys.has(key(variantName))) throw new Error("This variant name is repeated for the same item.");
        if (group.entry.item.variants.length >= 30) throw new Error("An item can have at most 30 variants.");
        group.variantKeys.add(key(variantName));
        group.entry.item.variants.push(...item.variants);
        group.rows.push(row);
      } else groups.set(itemKey, { entry: { category, subcategory, item: importItem }, rows: [row], signature, variantKeys: new Set(variantName ? [key(variantName)] : []) });
    } catch (error) {
      const message = error instanceof Error && "issues" in error ? "Check optional values, text lengths, selection limits, and spice (0–3)." : error instanceof Error ? error.message : "Check this row.";
      issues.push({ row, message });
    }
  });
  const items = [...groups.values()].map(group => group.entry);
  if (items.length > 200) issues.push({ row: 1, message: "Import at most 200 items at a time." });
  if (!rowCount) issues.push({ row: 2, message: "Add at least one item beneath the header." });
  if (!issues.length) {
    const payload = { operation: "importItems", payload: { request_id: "00000000-0000-4000-8000-000000000000", items } };
    if (!editorMutation.safeParse(payload).success) issues.push({ row: 1, message: "Some items do not meet the menu limits." });
    if (new TextEncoder().encode(JSON.stringify(payload.payload)).length > 480000) issues.push({ row: 1, message: "This import is too large. Split it into smaller sheets." });
  }
  return { items, issues, rowCount };
}
