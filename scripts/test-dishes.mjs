import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { normalizeDishName } from "../src/lib/dishes/normalize.ts";
import { applyDishMatch, matchDish } from "../src/lib/dishes/match.ts";
import { buildDishIndex, dishMatchesName, exactDish, nearMissDish, suggestDishes } from "../src/lib/dishes/search.ts";
import { editorMutation } from "../src/lib/editor/schemas.ts";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
const tricky = ["Mo:Mo", "Half Plate Chicken-Momo", "Chatamari (Plain)", "Dal Bhat / Tarkari", "चिकेन म:म:", "Large  Pizza", "Coca-Cola 500ml",
  "  spaced   out  ", "Tea & Coffee", "Rs. 5 + tax", "“Quoted” — dash", "FULL", "", "Regularly", "Halfway house", "a_b-c/d", "!!!", "Lassi (Sweet)"];

async function seedDishes() {
  const sql = await readFile(new URL("202611010002_dish_catalog_seed.sql", migrationsDir), "utf8");
  return JSON.parse(/\$seed\$(.*)\$seed\$/s.exec(sql)[1]);
}

test("dish name normalisation: TypeScript and SQL agree, including every seeded name", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  for (const file of (await readdir(migrationsDir)).filter(name => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, migrationsDir), "utf8"));
  const seeded = await seedDishes();
  for (const value of [...tricky, ...seeded.flatMap(dish => [dish.name, dish.name_ne ?? ""])]) {
    const { rows } = await db.query("select private.normalize_dish_name($1) as key", [value]);
    assert.equal(rows[0].key, normalizeDishName(value), JSON.stringify(value));
  }
  assert.equal(normalizeDishName("Mo:Mo"), "momo");
  assert.equal(normalizeDishName("Chatamari (Plain)"), "chatamari plain");
  assert.equal(normalizeDishName("Half Plate Chicken-Momo"), "plate chicken momo");
  assert.notEqual(normalizeDishName("Chatamari (Egg)"), normalizeDishName("Chatamari (Plain)"));
  assert.equal(normalizeDishName("Halfway house"), "halfway house");

  await t.test("the seed is a clean catalog: names are unique and every dish has a Nepali name", async () => {
    assert.equal((await db.query("select count(*)::int as n from public.dishes")).rows[0].n, seeded.length);
    const keys = seeded.map(dish => normalizeDishName(dish.name));
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(new Set(seeded.map(dish => dish.slug)).size, seeded.length);
    assert.ok(seeded.every(dish => dish.name_ne && dish.category));
    const { rows } = await db.query("select count(*)::int as n from public.dishes d where cardinality(d.search_keys) = 0");
    assert.equal(rows[0].n, 0);
  });
});

test("dish search: prefix, alias, Nepali and fuzzy matches; near misses never fire on exact names", async () => {
  const seeded = await seedDishes();
  const index = buildDishIndex(seeded.map((dish, position) => ({
    id: `00000000-0000-4000-8000-${String(position).padStart(12, "0")}`, name: dish.name, nameNe: dish.name_ne, category: dish.category, aliases: [],
  })));
  const names = query => suggestDishes(index, query).map(dish => dish.name);
  assert.equal(names("chicken momo")[0], "Chicken Momo");
  assert.equal(names("chic mo")[0], "Chicken Momo");
  assert.ok(names("buff").length > 1 && names("buff").every(name => /buff/i.test(name)));
  assert.equal(names("chiken momo")[0], "Chicken Momo");
  assert.equal(names("mo:mo").length > 0, true);
  assert.deepEqual(names("x"), []);
  assert.deepEqual(names("   "), []);
  assert.equal(suggestDishes(index, "momo").length <= 6, true);
  assert.equal(names("चिकेन म:म:")[0], "Chicken Momo");

  assert.equal(nearMissDish(index, "Chiken Momo")?.name, "Chicken Momo");
  assert.equal(nearMissDish(index, "Chicken Momo"), null);
  assert.equal(nearMissDish(index, "Half Chicken Momo"), null);
  assert.equal(nearMissDish(index, "zzzzzz qqqq"), null);
  assert.equal(nearMissDish(index, "abc"), null);
  assert.equal(exactDish(index, "chicken  MOMO")?.name, "Chicken Momo");
  const dish = { name: "Chicken Momo", nameNe: null, aliases: ["Kukhura Momo"] };
  assert.equal(dishMatchesName(dish, "kukhura momo"), true);
  assert.equal(dishMatchesName(dish, "Buff Momo"), false);
  assert.equal(dishMatchesName(dish, ""), false);
});

test("import matching links exact names and only renames near misses the owner accepts", async () => {
  const seeded = await seedDishes();
  const index = buildDishIndex(seeded.map((dish, position) => ({
    id: `00000000-0000-4000-8000-${String(position).padStart(12, "0")}`, name: dish.name, nameNe: dish.name_ne, category: dish.category, aliases: [],
  })));
  const entry = name => ({ category: "Momo", subcategory: "", item: { name, name_ne: null, description: null, description_ne: null, price_minor: 100, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: true } });
  const exact = matchDish(index, "chicken  momo");
  assert.equal(exact?.kind, "exact");
  const linked = applyDishMatch(entry("chicken  momo"), exact);
  assert.equal(linked.item.dish_id, exact.dish.id);
  assert.equal(linked.item.name, "chicken  momo");
  const near = matchDish(index, "Chiken Momo");
  assert.equal(near?.kind, "near");
  assert.equal(applyDishMatch(entry("Chiken Momo"), near).item.dish_id, undefined);
  assert.equal(applyDishMatch(entry("Chiken Momo"), near, "keep").item.name, "Chiken Momo");
  const used = applyDishMatch(entry("Chiken Momo"), near, "use");
  assert.equal(used.item.name, "Chicken Momo");
  assert.equal(used.item.dish_id, near.dish.id);
  assert.equal(used.item.name_ne, near.dish.nameNe);
  assert.equal(matchDish(index, "Zzzz Qqqq Special"), null);
  assert.equal(applyDishMatch(entry("Zzzz"), null).item.dish_id, undefined);
});

test("the item schema accepts a dish link and rejects a malformed one", () => {
  const item = { operation: "saveItem", payload: { category_id: randomUUID(), name: "Momo", name_ne: null, description: null, description_ne: null,
    price_minor: 100, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: false } };
  assert.equal(editorMutation.safeParse({ ...item, payload: { ...item.payload, dish_id: randomUUID() } }).success, true);
  assert.equal(editorMutation.safeParse({ ...item, payload: { ...item.payload, dish_id: null } }).success, true);
  assert.equal(editorMutation.safeParse({ ...item, payload: { ...item.payload, dish_id: "nope" } }).success, false);
});

test("dish catalog database: linking on save, review candidates, admin tools and isolation", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  for (const file of (await readdir(migrationsDir)).filter(name => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, migrationsDir), "utf8"));
  const admin = randomUUID(), ownerA = randomUUID(), ownerB = randomUUID();
  for (const [id, email] of [[admin, "admin@example.com"], [ownerA, "a@example.com"], [ownerB, "b@example.com"]]) await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [id, email]);
  await db.query("insert into private.super_admins values($1)", [admin]);
  async function asUser(id, fn) {
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    try { return await fn(); } finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  const denied = error => error.code === "42501";
  const tenantA = await asUser(ownerA, () => scalar("select public.create_restaurant('Kitchen A','dish-alpha')"));
  const tenantB = await asUser(ownerB, () => scalar("select public.create_restaurant('Kitchen B','dish-beta')"));
  const mutate = (user, tenant, operation, payload) => asUser(user, () => scalar("select public.mutate_menu($1,$2,$3::jsonb)", [tenant, operation, JSON.stringify(payload)]));
  const categoryOf = async (user, tenant, name) => (await mutate(user, tenant, "saveCategory", { name, name_ne: null, is_visible: true })).id;
  const saveItem = (user, tenant, category_id, name, extra = {}) => mutate(user, tenant, "saveItem", {
    category_id, name, name_ne: null, description: null, description_ne: null, price_minor: 18000, variants: [], is_available: true,
    diet: null, spice_level: null, confirm_prices: false, ...extra,
  });
  const dishOf = async id => (await db.query("select dish_id from public.menu_items where id=$1", [id])).rows[0].dish_id;
  const adminSave = payload => asUser(admin, () => scalar("select public.admin_save_dish($1::jsonb)", [JSON.stringify(payload)]));
  const dishId = async slug => scalar("select id from public.dishes where slug=$1", [slug]);
  const catA = await categoryOf(ownerA, tenantA, "Momo"), catB = await categoryOf(ownerB, tenantB, "Momo");
  const chickenMomo = await dishId("chicken-momo"), buffMomo = await dishId("buff-momo");

  await t.test("the catalog is public, read-only and hides HIDDEN dishes", async () => {
    const catalog = await asUser(null, () => scalar("select public.get_dish_catalog()"));
    assert.equal(catalog.length, (await seedDishes()).length);
    assert.deepEqual(Object.keys(catalog[0]).sort(), ["aliases", "category", "id", "name", "nameNe"]);
    for (const user of [null, ownerA]) await asUser(user, async () => {
      await assert.rejects(db.query("insert into public.dishes(name) values('Sneaky')"), denied);
      await assert.rejects(db.query("update public.dishes set name='x'"), denied);
      await assert.rejects(db.query("select search_keys from public.dishes limit 1"), denied);
      await assert.rejects(db.query("select * from private.dish_name_candidates"), denied);
      await assert.rejects(db.query("select private.normalize_dish_name('x')"), denied);
    });
    await db.query("update public.dishes set status='HIDDEN' where slug='sel-roti'");
    assert.equal((await asUser(null, () => scalar("select public.get_dish_catalog()"))).some(dish => dish.name === "Sel Roti"), false);
    assert.equal((await asUser(ownerA, () => db.query("select id from public.dishes where slug='sel-roti'"))).rows.length, 0);
    await db.query("update public.dishes set status='ACTIVE' where slug='sel-roti'");
  });

  await t.test("saving an item links an exact name, or a valid pick, and keeps links honest", async () => {
    const exact = (await saveItem(ownerA, tenantA, catA, "chicken  MOMO")).id;
    assert.equal(await dishOf(exact), chickenMomo);
    const picked = (await saveItem(ownerA, tenantA, catA, "Chicken Momo (Spicy)", { dish_id: chickenMomo })).id;
    assert.equal(await dishOf(picked), null);
    const wrong = (await saveItem(ownerA, tenantA, catA, "Buff Momo", { dish_id: chickenMomo })).id;
    assert.equal(await dishOf(wrong), buffMomo);
    const fake = (await saveItem(ownerA, tenantA, catA, "Totally Custom Dish", { dish_id: randomUUID() })).id;
    assert.equal(await dishOf(fake), null);
    await assert.rejects(saveItem(ownerA, tenantA, catA, "Aloo Tama", { dish_id: "not-a-uuid" }));
    await saveItem(ownerA, tenantA, catA, "Veg Momo", { id: exact });
    assert.equal(await dishOf(exact), await dishId("veg-momo"));
    await saveItem(ownerA, tenantA, catA, "Mo:Mo Special", { id: exact });
    assert.equal(await dishOf(exact), null);
    await saveItem(ownerA, tenantA, catA, "Buff Momo", { id: exact, dish_id: null });
    assert.equal(await dishOf(exact), buffMomo);
  });

  await t.test("a link survives while the name still matches, even after the dish is hidden", async () => {
    const item = (await saveItem(ownerA, tenantA, catA, "Pork Momo")).id;
    const pork = await dishOf(item);
    assert.equal(pork, await dishId("pork-momo"));
    await db.query("update public.dishes set status='HIDDEN' where id=$1", [pork]);
    await saveItem(ownerA, tenantA, catA, "Pork Momo", { id: item, description: "kept" });
    assert.equal(await dishOf(item), pork);
    const second = (await saveItem(ownerA, tenantA, catA, "Pork  momo!")).id;
    assert.equal(await dishOf(second), null);
    await db.query("update public.dishes set status='ACTIVE' where id=$1", [pork]);
  });

  await t.test("unmatched names are recorded once per restaurant and stay private", async () => {
    await saveItem(ownerA, tenantA, catA, "Gundruk Pizza");
    await saveItem(ownerA, tenantA, catA, "gundruk  pizza!", { price_minor: 1000 });
    await saveItem(ownerB, tenantB, catB, "Gundruk Pizza");
    const rows = (await db.query("select * from private.dish_name_candidates where normalized='gundruk pizza'")).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].restaurant_count, 2);
    assert.equal(rows[0].sample_name, "Gundruk Pizza");
    assert.equal((await db.query("select * from private.dish_name_candidates where normalized='momo'")).rows.length, 0);
    assert.equal((await db.query("select * from private.dish_name_candidates where normalized in ('chicken momo','buff momo')")).rows.length, 0);
  });

  await t.test("bulk import links items through the same path", async () => {
    const receipt = await mutate(ownerB, tenantB, "importItems", { request_id: randomUUID(), items: [
      { category: "Soup", subcategory: "", item: { name: "Thukpa Soup (Plain)", name_ne: null, description: null, description_ne: null, price_minor: 25000, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: false, dish_id: await dishId("thukpa-soup-plain") } },
      { category: "Soup", subcategory: "", item: { name: "Moon Soup", name_ne: null, description: null, description_ne: null, price_minor: 25000, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: false } },
    ] });
    assert.ok(receipt.slug);
    const linked = (await db.query("select name, dish_id from public.menu_items where restaurant_id=$1 and name in ('Thukpa Soup (Plain)','Moon Soup') order by name", [tenantB])).rows;
    assert.equal(linked[0].dish_id, null);
    assert.ok(linked[1].dish_id);
  });

  await t.test("only super admins can use the admin tools", async () => {
    for (const user of [ownerA, null]) await asUser(user, async () => {
      for (const sql of ["select public.admin_list_dishes(null,null,1,20)", "select public.admin_save_dish('{\"name\":\"X\"}'::jsonb)",
        `select public.admin_merge_dishes('${chickenMomo}','${buffMomo}')`, "select public.admin_list_dish_candidates(null,1,20)",
        "select public.admin_resolve_dish_candidate('gundruk pizza','dismiss',null)"]) await assert.rejects(db.query(sql), denied, sql);
    });
  });

  await t.test("admin lists, creates, edits and cleans dishes", async () => {
    const page = await asUser(admin, () => scalar("select public.admin_list_dishes('momo',null,1,5)"));
    assert.equal(page.rows.length, 5);
    assert.ok(page.total > 5);
    assert.ok(page.rows.every(row => /momo/i.test(`${row.name} ${row.category}`)));
    const created = await adminSave({ name: "  Gundruk Ko Jhol ", name_ne: "", category: "Soup", aliases: ["Gundruk Soup", "gundruk soup", " ", "Jhol"], tags: ["veg", "veg"], status: "ACTIVE" });
    assert.equal(created.name, "Gundruk Ko Jhol");
    assert.deepEqual(created.aliases, ["Gundruk Soup", "Jhol"]);
    assert.deepEqual(created.tags, ["veg"]);
    assert.equal(created.nameNe, null);
    const updated = await adminSave({ id: created.id, name: "Gundruk Ko Jhol", aliases: ["Gundruk Soup"], tags: [], status: "HIDDEN", category: "Soup" });
    assert.equal(updated.status, "HIDDEN");
    for (const bad of [{ name: "" }, { name: "!!!" }, { name: "x".repeat(151) }, { name: "Ok", status: "GONE" }, { id: randomUUID(), name: "Missing" }])
      await assert.rejects(adminSave(bad), error => ["23514", "P0002"].includes(error.code), JSON.stringify(bad));
    await assert.rejects(adminSave({ name: "Too many", aliases: Array.from({ length: 31 }, (_, index) => `alias ${index}`) }), error => error.code === "23514");
    const hidden = await asUser(admin, () => scalar("select public.admin_list_dishes(null,'HIDDEN',1,20)"));
    assert.ok(hidden.rows.some(row => row.id === created.id));
    assert.ok((await db.query("select 1 from public.audit_events where action in ('admin.dish.created','admin.dish.updated')")).rows.length >= 2);
  });

  await t.test("promoting a dish links items already saved under that name", async () => {
    const created = await adminSave({ name: "Gundruk Pizza", category: "Fast Food", aliases: [], tags: [] });
    assert.equal(created.itemCount, 3);
    assert.equal((await db.query("select * from private.dish_name_candidates where normalized='gundruk pizza'")).rows.length, 0);
    const item = (await db.query("select id from public.menu_items where restaurant_id=$1 and name='Gundruk Pizza'", [tenantA])).rows[0].id;
    assert.equal(await dishOf(item), created.id);
  });

  await t.test("review list: resolve a candidate as an alias, a new dish or a dismissal", async () => {
    await saveItem(ownerA, tenantA, catA, "Kukhura Momo");
    await saveItem(ownerB, tenantB, catB, "kukhura momo");
    await saveItem(ownerA, tenantA, catA, "Ghost Dish");
    await saveItem(ownerA, tenantA, catA, "Fresh Idea");
    const list = await asUser(admin, () => scalar("select public.admin_list_dish_candidates(null,1,20)"));
    assert.equal(list.rows[0].normalized, "kukhura momo");
    assert.equal(list.rows[0].restaurantCount, 2);
    assert.equal((await asUser(admin, () => scalar("select public.admin_list_dish_candidates('ghost',1,20)"))).rows.length, 1);

    const alias = await asUser(admin, () => scalar("select public.admin_resolve_dish_candidate('kukhura momo','alias',$1)", [chickenMomo]));
    assert.equal(alias.linkedItems, 2);
    assert.ok((await db.query("select aliases from public.dishes where id=$1", [chickenMomo])).rows[0].aliases.includes("Kukhura Momo"));
    const saved = (await db.query("select dish_id from public.menu_items where lower(name)='kukhura momo'")).rows;
    assert.ok(saved.length === 2 && saved.every(row => row.dish_id === chickenMomo));

    const created = await asUser(admin, () => scalar("select public.admin_resolve_dish_candidate('fresh idea','dish',null)"));
    assert.equal(created.linkedItems, 1);
    assert.equal((await db.query("select 1 from public.dishes where name='Fresh Idea'")).rows.length, 1);

    await asUser(admin, () => scalar("select public.admin_resolve_dish_candidate('ghost dish','dismiss',null)"));
    assert.equal((await db.query("select * from private.dish_name_candidates where normalized='ghost dish'")).rows.length, 0);
    await asUser(admin, async () => {
      await assert.rejects(db.query("select public.admin_resolve_dish_candidate('ghost dish','dismiss',null)"), error => error.code === "P0002");
      await assert.rejects(db.query("select public.admin_resolve_dish_candidate('fresh idea','explode',null)"), error => error.code === "P0002" || error.code === "23514");
    });
  });

  await t.test("merging moves links and keeps the old names as aliases", async () => {
    const duplicate = await adminSave({ name: "Chicken Momos Duplicate", aliases: ["Kukhuraa Momo"], tags: [] });
    const item = (await saveItem(ownerA, tenantA, catA, "Chicken Momos Duplicate")).id;
    assert.equal(await dishOf(item), duplicate.id);
    const merged = await asUser(admin, () => scalar("select public.admin_merge_dishes($1,$2)", [duplicate.id, chickenMomo]));
    assert.equal(merged.id, chickenMomo);
    assert.ok(merged.aliases.includes("Chicken Momos Duplicate") && merged.aliases.includes("Kukhuraa Momo"));
    assert.equal(await dishOf(item), chickenMomo);
    assert.equal((await db.query("select 1 from public.dishes where id=$1", [duplicate.id])).rows.length, 0);
    await asUser(admin, async () => {
      await assert.rejects(db.query("select public.admin_merge_dishes($1,$1)", [chickenMomo]), error => error.code === "23514");
      await assert.rejects(db.query("select public.admin_merge_dishes($1,$2)", [randomUUID(), chickenMomo]), error => error.code === "P0002");
    });
  });

  await t.test("deleting a dish unlinks items instead of removing them", async () => {
    const item = (await saveItem(ownerA, tenantA, catA, "Sel Roti")).id;
    assert.ok(await dishOf(item));
    await db.query("delete from public.dishes where slug='sel-roti'");
    assert.equal(await dishOf(item), null);
    assert.equal((await db.query("select 1 from public.menu_items where id=$1", [item])).rows.length, 1);
  });

  await t.test("owners still cannot touch another tenant through the wrapper", async () => {
    await assert.rejects(mutate(ownerA, tenantB, "saveItem", { category_id: catB, name: "Intruder", name_ne: null, description: null, description_ne: null,
      price_minor: 1, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: false }), error => ["42501", "P0002"].includes(error.code));
    assert.equal((await db.query("select 1 from public.menu_items where name='Intruder'")).rows.length, 0);
  });
});
