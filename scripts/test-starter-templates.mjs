import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { importColumns, parseCsv, previewImport } from "../src/lib/editor/import.ts";
import { starterTemplates } from "../src/lib/editor/starter-templates.ts";

const withPrices = table => table.map((row, index) => index === 0 ? row : row.map((cell, column) => table[0][column] === "price" ? "100.00" : cell));

for (const { slug } of starterTemplates) {
  test(`starter template ${slug} imports once prices are filled in`, async () => {
    const table = parseCsv(await readFile(`public/templates/menu-starter-${slug}.csv`, "utf8"));
    assert.deepEqual(table[0], [...importColumns]);
    const blank = previewImport(table);
    assert.equal(blank.items.length, 0);
    assert.equal(blank.issues.length, table.length - 1, "every row asks for a price");
    const filled = previewImport(withPrices(table));
    assert.deepEqual(filled.issues, []);
    assert.equal(filled.items.length, table.length - 1);
    const names = filled.items.map(({ category, subcategory, item }) => `${category}/${subcategory}/${item.name}`.toLowerCase());
    assert.equal(new Set(names).size, names.length, "no duplicate dishes");
  });

  test(`starter workbook ${slug} matches its CSV`, async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(`public/templates/menu-starter-${slug}.xlsx`);
    const rows = parseCsv(await readFile(`public/templates/menu-starter-${slug}.csv`, "utf8")).length;
    assert.equal(workbook.getWorksheet("Menu").actualRowCount, rows);
    assert.ok(workbook.getWorksheet("Instructions"));
  });
}
