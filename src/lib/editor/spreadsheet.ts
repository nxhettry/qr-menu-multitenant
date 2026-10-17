import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseCsv } from "./import";

export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error("Choose a file smaller than 1 MB.");
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an .xlsx or .csv file.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet("Menu") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no menu sheet.");
  if (sheet.rowCount > MAX_IMPORT_ROWS + 1 || sheet.columnCount > 24) throw new Error("Use the template with at most 1,000 rows and 24 columns.");
  const table: string[][] = [];
  for (let row = 1; row <= sheet.rowCount; row++) {
    const values: string[] = [];
    for (let col = 1; col <= sheet.columnCount; col++) {
      const value = sheet.getCell(row, col).value;
      if (value !== null && !["string", "number", "boolean"].includes(typeof value)) throw new Error(`Row ${row}: use plain values; formulas, links, and date cells are not supported.`);
      values.push(value === null ? "" : String(value));
    }
    table.push(values);
  }
  return table;
}
