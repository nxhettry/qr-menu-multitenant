import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import { importColumns } from "../src/lib/editor/import.ts";

const workbook = new ExcelJS.Workbook();
workbook.creator = "QR Menu";
const sheet = workbook.addWorksheet("Menu", { views: [{ state: "frozen", ySplit: 1 }] });
sheet.columns = importColumns.map(key => ({ header: key, key, width: ["description", "description_ne", "allergen_notes", "addons", "hidden_fields"].includes(key) ? 42 : 22 }));
sheet.getRow(1).height = 30;
sheet.getRow(1).eachCell(cell => {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9A3412" } };
  cell.alignment = { vertical: "middle" };
});
sheet.autoFilter = { from: "A1", to: "X1" };
const example = {
  category: "Momo", subcategory: "Chicken", name: "Steamed momo", name_ne: "चिकेन म:म:",
  description: "Steamed chicken dumplings with tomato achar.", description_ne: "", variant: "Half plate", variant_ne: "", price: "150.00", type: "Non-veg",
  available: "TRUE", variant_available: "TRUE", visible: "TRUE", popular: "TRUE", new: "FALSE", featured: "FALSE",
  tags: "House favourite|Handmade", prep_minutes: "15", calories: "320", spice: "1", allergens: "Wheat|Sesame",
  allergen_notes: "Example only: verify ingredients with your kitchen.", addons: "Extra achar:30|Cheese:50", hidden_fields: "calories",
};
sheet.addRow(example);
sheet.addRow({ ...example, variant: "Full plate", price: "250.00" });
for (const col of ["K", "L", "M", "N", "O", "P"]) sheet.dataValidations.add(`${col}2:${col}1001`, { type: "list", allowBlank: true, formulae: ['"TRUE,FALSE"'], showErrorMessage: true, error: "Choose TRUE or FALSE." });
sheet.dataValidations.add("J2:J1001", { type: "list", allowBlank: true, formulae: ['"Veg,Non-veg,Egg"'], showErrorMessage: true, error: "Choose Veg, Non-veg, Egg, or leave blank." });
sheet.dataValidations.add("T2:T1001", { type: "whole", operator: "between", allowBlank: true, formulae: [0, 3], showErrorMessage: true, error: "Use 0 (no spice), 1 (mild), 2 (medium), or 3 (hot)." });
const notes = workbook.addWorksheet("Instructions");
notes.columns = [{ header: "Field / topic", width: 30 }, { header: "Instructions", width: 110 }];
notes.addRows([
  ["Start here", "Delete the two illustrative example rows. Add your real dishes to the Menu sheet. Example prices and allergen claims are not recommendations."],
  ["Limits", "Maximum 200 items / 1,000 rows, file up to 1 MB. Use plain values, not formulas, hyperlinks or date cells. Save as .xlsx or UTF-8 CSV."],
  ["Hierarchy", "Category → Subcategory → Item → Variants. Example: Momo → Chicken → Steamed momo → Half plate / Full plate."],
  ["Required columns", "category, name, price. Subcategory and other optional details can be blank."],
  ["Variants", "One row per variant. Repeat all item details exactly; change only variant, variant_ne, price, variant_available. Leave variant blank for single-price items."],
  ["price", "Rupees, without Rs or commas, up to two decimal places. For example 180.05. Prices are saved exactly as integer paisa."],
  ["type", "Veg, Non-veg, Egg or blank. Stored separately from category/subcategory."],
  ["available", "TRUE (default) or FALSE. FALSE shows the item as sold out."],
  ["variant_available", "TRUE (default) or FALSE for this portion. Only used with variants."],
  ["visible", "TRUE (default) or FALSE. FALSE hides the whole item from guests while keeping it in the editor."],
  ["popular, new, featured", "TRUE/FALSE, default FALSE. Featured specials are limited to six per restaurant, including existing specials."],
  ["tags, allergens", "Separate labels with |, e.g. Wheat|Sesame. Up to 10 tags / 20 allergens, 60 characters each. Only enter verified allergen information."],
  ["prep_minutes, calories", "Optional whole numbers: preparation 1–1440 minutes; calories 0–100000 kcal."],
  ["spice", "Blank, 0 (no spice), 1 (mild), 2 (medium), or 3 (hot)."],
  ["addons", "Optional extras as Name:price|Name:price, e.g. Extra achar:30|Cheese:50. Imported into an optional Extras group. Customize groups and availability in the item editor."],
  ["hidden_fields", "Optional | separated keys: photos|description|nepali|diet|spice|preparation|calories|tags|badges|allergens|addons. These details stay saved but hidden from guests. Menu-wide settings also apply."],
  ["name_ne, description_ne", "Optional Nepali text. variant_ne is the optional Nepali portion name."],
  ["New items only", "Existing category/subcategory names are reused without changing their visibility. Existing items are flagged for review and never overwritten. Fix errors and upload again before confirming."],
  ["Photos", "Add photos in the dashboard after import. Do not add image URL columns."],
]);
notes.getRow(1).font = { bold: true, color: { argb: "FF9A3412" } };
notes.eachRow(row => { row.alignment = { wrapText: true, vertical: "top" }; row.height = 45; });
await mkdir("public/templates", { recursive: true });
await workbook.xlsx.writeFile("public/templates/menu-import.xlsx");
const csv = [importColumns.join(","), ...[example, { ...example, variant: "Full plate", price: "250.00" }].map(row => importColumns.map(key => '"' + String(row[key] ?? "").replaceAll('"', '""') + '"').join(","))].join("\r\n");
await writeFile("public/templates/menu-import.csv", "\uFEFF" + csv + "\r\n", "utf8");
console.log("Generated Excel and UTF-8 CSV menu templates.");
