import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { PGlite } from "@electric-sql/pglite";
import { importColumns, parseCsv, previewImport } from "../src/lib/editor/import.ts";
import { itemDetailsSchema } from "../src/lib/menu/details.ts";
import { publicMenuSchema } from "../src/lib/menu/schema.ts";
import { editorDataSchema } from "../src/lib/editor/data.ts";
import { previewMenu } from "../src/lib/editor/preview.ts";

const table = rows => [importColumns, ...rows.map(row => importColumns.map(column => String(row[column] ?? "")))];
const base = { category: "Momo", subcategory: "Chicken", name: "Steamed momo", price: "180.05", type: "Non-veg" };

test("spreadsheet preview groups variants, preserves exact prices and all optional details", () => {
  const item = { ...base, popular: "TRUE", tags: "Handmade|Favourite", allergens: "Wheat|Sesame", prep_minutes: "15", calories: "320", addons: "Extra achar:30|Cheese:50", hidden_fields: "calories|photos", spice: "0" };
  const preview = previewImport(table([{ ...item, variant: "Half", price: "90.05" }, { ...item, variant: "Full", variant_available: "FALSE" }]));
  assert.deepEqual(preview.issues, []);
  assert.equal(preview.items.length, 1);
  const result = preview.items[0];
  assert.equal(result.subcategory, "Chicken");
  assert.equal(result.item.diet, "NON_VEG");
  assert.deepEqual(result.item.variants.map(value => [value.name, value.price_minor, value.is_available]), [["Half", 9005, true], ["Full", 18005, false]]);
  assert.equal(result.item.details.addon_groups[0].options[0].price_minor, 3000);
  assert.equal(result.item.details.is_popular, true);
  assert.equal(result.item.spice_level, 0);
});

test("invalid rows, conflicting variant details, duplicate items and limits prevent import", () => {
  for (const row of [{ ...base, price: "1.005" }, { ...base, available: "maybe" }, { ...base, type: "meat" }, { ...base, calories: "-2" }, { ...base, addons: "No price" }, { ...base, hidden_fields: "not-a-field" }, { ...base, spice: "5" }]) assert(previewImport(table([row])).issues.length, JSON.stringify(row));
  assert(previewImport(table([{ ...base, variant: "Half" }, { ...base, variant: "Full", description: "Conflicting" }])).issues.length);
  assert(previewImport(table([{ ...base, variant: "Half" }, { ...base, variant: "half" }])).issues.length);
  assert(previewImport(table([base, base])).issues.length);
  const root = { id: randomUUID(), name: "Momo", parent_id: null, items: [] };
  const child = { id: randomUUID(), name: "Chicken", parent_id: root.id, items: [{ name: "Steamed momo" }] };
  assert(previewImport(table([base]), [root, child]).issues[0].message.includes("already exists"));
  assert.throws(() => previewImport(table(Array.from({ length: 1001 }, () => base))));
  assert(previewImport(table(Array.from({ length: 201 }, (_, i) => ({ ...base, name: `Momo ${i}` })))).issues.length);
  assert.throws(() => previewImport([["category", "name", "price", "image_url"], ["Momo", "Momo", "100", "https://example.test"]]));
});

test("CSV handles UTF-8, quoting and newlines and rejects malformed quoting", () => {
  assert.deepEqual(parseCsv('\uFEFFname,description\r\n"म:म:","Fresh, warm\nWith ""achar"""\r\n'), [["name", "description"], ["म:म:", 'Fresh, warm\nWith "achar"']]);
  for (const input of ['"unclosed', '"closed"suffix', 'a"b']) assert.throws(() => parseCsv(input));
});

test("downloadable Excel and CSV templates round-trip into the same valid preview", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("public/templates/menu-import.xlsx");
  const sheet = workbook.getWorksheet("Menu");
  const rows = [];
  sheet.eachRow(row => rows.push(importColumns.map((_, i) => row.getCell(i + 1).text)));
  const excel = previewImport(rows);
  const csv = previewImport(parseCsv(await readFile("public/templates/menu-import.csv", "utf8")));
  assert.deepEqual(excel.issues, []);
  assert.deepEqual(excel.items, csv.items);
  assert.equal(excel.items[0].item.variants.length, 2);
  assert(workbook.getWorksheet("Instructions"));
});

test("bulk menu migration enforces hierarchy, visibility, atomicity, idempotency and tenant isolation", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  for (const file of ["202610160001_foundation.sql", "202610160002_owner_editor.sql", "202610160003_featured_menu.sql", "202610170001_bulk_menu.sql","202610280001_slug_availability.sql"]) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  const owner = randomUUID(), other = randomUUID(), editor = randomUUID();
  for (const id of [owner, other, editor]) await db.query("insert into auth.users values($1,now())", [id]);
  async function scalar(sql, args = []) { return Object.values((await db.query(sql, args)).rows[0])[0]; }
  async function asUser(id, operation) {
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    try { return await operation(); } finally { await db.exec("reset role"); }
  }
  const tenant = await asUser(owner, () => scalar("select public.create_restaurant('Import Kitchen','import-kitchen')"));
  const foreignTenant = await asUser(other, () => scalar("select public.create_restaurant('Foreign Kitchen','foreign-kitchen')"));
  await db.query("insert into public.memberships(user_id,restaurant_id,role) values($1,$2,'EDITOR')", [editor, tenant]);
  const mutate = (operation, payload, actor = owner, id = tenant) => asUser(actor, () => scalar("select public.mutate_menu($1,$2,$3::jsonb)", [id, operation, JSON.stringify(payload)]));
  const payload = { request_id: randomUUID(), items: previewImport(table([{ ...base, variant: "Half", popular: "TRUE", description: "Secret description", allergens: "Wheat", addons: "Extra achar:30" }, { ...base, variant: "Full", price: "250", popular: "TRUE", description: "Secret description", allergens: "Wheat", addons: "Extra achar:30" }])).items };
  await t.test("batch adds nested categories and variants and retry adds nothing", async () => {
    await mutate("importItems", payload);
    await mutate("importItems", payload);
    assert.equal(await scalar("select count(*)::int from public.menu_items where restaurant_id=$1", [tenant]), 1);
    assert.equal(await scalar("select count(*)::int from public.menu_categories where restaurant_id=$1", [tenant]), 2);
    assert.equal(await scalar("select count(*)::int from public.menu_item_variants where restaurant_id=$1", [tenant]), 2);
    await assert.rejects(mutate("importItems", { ...payload, items: [{ ...payload.items[0], category: "Changed" }] }), error => error.code === "23514");
  });
  const snapshot = () => asUser(owner, () => scalar("select public.get_editor_menu($1)", [tenant]));
  const saved = editorDataSchema.parse(await snapshot());
  const parent = saved.categories.find(value => !value.parent_id), child = saved.categories.find(value => value.parent_id);
  const item = child.items[0];
  await t.test("invalid later rows and duplicates roll back earlier rows and categories", async () => {
    const fresh = { ...payload.items[0], category: "Rollback", item: { ...payload.items[0].item, name: "Fresh" } };
    await assert.rejects(mutate("importItems", { request_id: randomUUID(), items: [fresh, payload.items[0]] }), error => error.code === "23514");
    assert.equal(await scalar("select count(*)::int from public.menu_categories where restaurant_id=$1 and name='Rollback'", [tenant]), 0);
    await assert.rejects(mutate("importItems", { request_id: randomUUID(), items: [fresh, { ...fresh, item: { ...fresh.item, name: "Invalid", price_minor: -1, variants: [] } }] }));
    assert.equal(await scalar("select count(*)::int from public.menu_items where restaurant_id=$1", [tenant]), 1);
  });
  await t.test("public projection and owner preview agree; hidden items and ancestors stay private", async () => {
    await mutate("visibility", { published: true });
    const readPublic = () => asUser(null, () => scalar("select public.get_public_menu('import-kitchen')"));
    let menu = publicMenuSchema.parse(await readPublic());
    assert.equal(menu.categories[0].items[0].subcategory, "Chicken");
    assert.equal(menu.categories[0].items[0].details.addon_groups[0].options[0].price_minor, 3000);
    await mutate("displaySettings", { hidden_fields: ["description", "allergens", "addons"] });
    menu = publicMenuSchema.parse(await readPublic());
    assert.equal(menu.categories[0].items[0].description, null);
    assert.deepEqual(menu.categories[0].items[0].details.allergens, []);
    assert.deepEqual(menu.categories[0].items[0].details.addon_groups, []);
    assert.deepEqual(previewMenu(editorDataSchema.parse(await snapshot())), menu);
    await mutate("itemVisibility", { id: item.id, visible: false });
    assert.equal((await readPublic()).categories[0].items.length, 0);
    assert((await snapshot()).categories.find(value => value.id === child.id).items.length);
    await mutate("itemVisibility", { id: item.id, visible: true });
    await mutate("saveCategory", { id: parent.id, name: parent.name, name_ne: null, is_visible: false, parent_id: null });
    assert.deepEqual((await readPublic()).categories, []);
    await mutate("saveCategory", { id: parent.id, name: parent.name, name_ne: null, is_visible: true, parent_id: null });
  });
  await t.test("nested grandchildren, cycles, and deleting an occupied parent are rejected", async () => {
    for (const parent_id of [child.id, parent.id]) await assert.rejects(mutate("saveCategory", { id: parent.id, parent_id, name: "Invalid", name_ne: null, is_visible: true }), error => error.code === "23514");
    await assert.rejects(mutate("delete", { kind: "category", id: parent.id }), error => error.code === "23514");
  });
  await t.test("new RPCs and private base cannot bypass tenant/role checks", async () => {
    await assert.rejects(mutate("importItems", payload, null), error => error.code === "42501");
    await assert.rejects(mutate("importItems", payload, other), error => error.code === "P0002");
    await assert.rejects(mutate("itemVisibility", { id: item.id, visible: false }, other, foreignTenant), error => error.code === "P0002");
    await assert.rejects(mutate("displaySettings", { hidden_fields: [] }, editor), error => error.code === "42501");
    await asUser(owner, () => assert.rejects(db.query("select private.mutate_menu_base($1,'itemVisibility','{}')", [tenant]), error => error.code === "42501"));
    await assert.rejects(mutate("saveCategory", { parent_id: parent.id, name: "Foreign", name_ne: null, is_visible: true }, other, foreignTenant));
  });
  await t.test("database rejects malformed details even without the client validator", async () => {
    for (const details of [{ calories: -1 }, { hidden_fields: ["unknown"] }, { addon_groups: [{ name: "Extras", min_select: 1, max_select: 2, options: [] }] }]) await assert.rejects(mutate("saveItem", { ...payload.items[0].item, id: item.id, category_id: child.id, details }), error => error.code === "23514");
    assert(itemDetailsSchema.safeParse({}).success);
  });
});
