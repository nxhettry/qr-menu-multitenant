import ExcelJS from "exceljs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const libraryDir = new URL(".", import.meta.url).pathname;
const catalogPath = "docs/data/nepali-menu-items.xlsx";

export async function loadCatalog() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(catalogPath);
  const catalog = new Map();
  workbook.getWorksheet("Menu Items").eachRow((row, index) => {
    if (index > 1) catalog.set(row.getCell(9).value, { name: row.getCell(4).value, category: row.getCell(2).value });
  });
  return catalog;
}

export async function loadSet(name) {
  return JSON.parse(await readFile(path.join(libraryDir, `${name}.json`), "utf8"));
}

export async function loadSetNames() {
  return (await readdir(libraryDir)).filter(file => file.endsWith(".json")).map(file => path.basename(file, ".json"));
}

export async function validateSets(catalog) {
  const owner = new Map();
  const problems = [];
  for (const name of await loadSetNames()) {
    for (const dish of await loadSet(name)) {
      for (const slug of [dish.slug, ...(dish.covers ?? [])]) {
        if (!catalog.has(slug)) problems.push(`${name}: unknown slug ${slug}`);
        else if (owner.has(slug)) problems.push(`${name}: ${slug} already used in ${owner.get(slug)}`);
        else owner.set(slug, name);
      }
    }
  }
  if (problems.length) throw new Error(problems.join("\n"));
  return owner;
}
