import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { parseServerUrl } from "../src/lib/restrofuel/server-url.ts";
import { connectPath, parseConnectParams, safeConnectPath } from "../src/lib/restrofuel/connect-link.ts";
import { safeNextPath } from "../src/lib/auth/redirect.ts";
import { checkLicense } from "../src/lib/restrofuel/license.ts";
import { decryptSecret, encryptSecret, verifySignature } from "../src/lib/restrofuel/crypto.ts";
import { snapshotSchema } from "../src/lib/restrofuel/snapshot.ts";
import { isEmptySummary, planSync, summarize } from "../src/lib/restrofuel/plan.ts";
import { editorDataSchema } from "../src/lib/editor/data.ts";
import { syncReviewSchema } from "../src/lib/restrofuel/status.ts";

const CODE = "abcdefghijklmnopqrstuvwxyz012345";
const NOW = Date.parse("2026-11-25T10:00:00Z");

test("only tunnel addresses are accepted as RestroFuel servers", () => {
  assert.deepEqual(parseServerUrl("https://bluebird.kree.com.np"), { url: "https://bluebird.kree.com.np", tenantSlug: "bluebird" });
  assert.deepEqual(parseServerUrl("https://bluebird.kree.com.np/"), { url: "https://bluebird.kree.com.np", tenantSlug: "bluebird" });
  for (const value of ["http://bluebird.kree.com.np", "https://bluebird.kree.com.np:8443", "https://a.b.kree.com.np", "https://kree.com.np",
    "https://bluebird.kree.com.np.evil.com", "https://user@bluebird.kree.com.np", "https://bluebird.kree.com.np/api", "https://127.0.0.1", 42, null]) {
    assert.equal(parseServerUrl(value), null, String(value));
  }
});

test("connect links survive sign-in only in their exact shape", () => {
  const link = parseConnectParams("https://bluebird.kree.com.np", CODE);
  const path = connectPath(link);
  assert.equal(safeConnectPath(path), path);
  assert.equal(safeNextPath(path), path);
  assert.equal(safeNextPath(`${path}&extra=1`), "/dashboard");
  assert.equal(safeNextPath("/connect/restrofuel?server=https://evil.com&code=" + CODE), "/dashboard");
  assert.equal(safeNextPath("//evil.com/connect/restrofuel?x"), "/dashboard");
  assert.equal(safeNextPath(null, "/onboarding"), "/onboarding");
  assert.equal(parseConnectParams("https://bluebird.kree.com.np", "short"), null);
});

test("licenses must be signed by Fleet, for this restaurant, and active", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const keys = { t1: publicKey.export({ type: "spki", format: "pem" }).toString() };
  const token = (payload, key = privateKey) => {
    const body = Buffer.from(JSON.stringify({ kid: "t1", slug: "bluebird", state: "active", suspended: false, leaseUntil: "2026-12-01T00:00:00Z", ...payload })).toString("base64url");
    return `${body}.${sign(null, Buffer.from(body, "ascii"), key).toString("base64url")}`;
  };
  assert.deepEqual(checkLicense(token({}), "bluebird", NOW, keys), { ok: true, slug: "bluebird", state: "active" });
  assert.equal(checkLicense(token({}), "other", NOW, keys).reason, "other_restaurant");
  assert.equal(checkLicense(token({ state: "locked" }), "bluebird", NOW, keys).reason, "inactive");
  assert.equal(checkLicense(token({ suspended: true }), "bluebird", NOW, keys).reason, "inactive");
  assert.equal(checkLicense(token({ leaseUntil: "2026-11-01T00:00:00Z" }), "bluebird", NOW, keys).reason, "inactive");
  assert.equal(checkLicense(token({}, generateKeyPairSync("ed25519").privateKey), "bluebird", NOW, keys).reason, "invalid");
  assert.equal(checkLicense(token({ kid: "k9" }), "bluebird", NOW, keys).reason, "invalid");
  assert.equal(checkLicense(token({}), "bluebird", NOW).reason, "invalid", "test key is not Fleet's");
  assert.equal(checkLicense("garbage", "bluebird", NOW, keys).reason, "invalid");
});

test("link secrets round-trip encrypted, and server signatures are checked", () => {
  const key = randomBytes(32);
  const cipher = encryptSecret("s3cret", key);
  assert.notEqual(cipher, encryptSecret("s3cret", key));
  assert.equal(decryptSecret(cipher, key), "s3cret");
  assert.throws(() => decryptSecret(cipher, randomBytes(32)));

  const body = JSON.stringify({ event: "sync" });
  const timestamp = String(NOW);
  const signature = createHmac("sha256", "s3cret").update(`${timestamp}.${body}`).digest("hex");
  assert.equal(verifySignature("s3cret", timestamp, body, signature, NOW), true);
  assert.equal(verifySignature("s3cret", timestamp, body + " ", signature, NOW), false);
  assert.equal(verifySignature("other", timestamp, body, signature, NOW), false);
  assert.equal(verifySignature("s3cret", timestamp, body, signature, NOW + 6 * 60 * 1000), false);
  assert.equal(verifySignature("s3cret", null, body, signature, NOW), false);
  assert.equal(verifySignature("s3cret", timestamp, body, "zz", NOW), false);
});

const snapshot = (items, categories = [{ ref: "1", name: "Momo", description: null, sortOrder: 0 }, { ref: "2", name: "Drinks", description: null, sortOrder: 1 }]) =>
  snapshotSchema.parse({ v: 1, edition: "vat", pricesIncludeVat: false, restaurant: null, categories, items });
const item = (ref, over = {}) => ({ ref, categoryRef: "1", name: `Item ${ref}`, description: null, price: 100, isVeg: false, isAvailable: true, addons: [], ...over });

test("snapshots convert prices to paisa and leave non-veg unlabelled", () => {
  const parsed = snapshot([item("10", { price: 150.5, isVeg: true, addons: [{ name: "Cheese", price: 40 }] })]);
  const summary = summarize(parsed, { categories: [], items: [] });
  assert.deepEqual(summary.added, [{ ref: "10", name: "Item 10", price_minor: 15050, category: "Momo" }]);
  assert.equal(isEmptySummary(summarize(snapshot([]), { categories: [], items: [] })), true);
  assert.throws(() => snapshotSchema.parse({ v: 1, edition: "vat", pricesIncludeVat: false, restaurant: null, categories: [], items: [item("x")] }));
});

test("RestroFuel menu sync in the database", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));

  const [owner, editor, stranger] = [randomUUID(), randomUUID(), randomUUID()];
  await db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'o@x.com',now()),($2,'e@x.com',now()),($3,'s@x.com',now())", [owner, editor, stranger]);
  async function asUser(id, fn) {
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    try { return await fn(); }
    finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const restaurant = await asUser(owner, () => scalar("select public.create_restaurant('Bluebird','bluebird')"));
  await db.query("insert into public.memberships values($1,$2,'EDITOR')", [editor, restaurant]);
  const linkId = randomUUID();
  const mutate = (operation, payload) => asUser(owner, () => scalar("select public.mutate_menu($1,$2,$3::jsonb)", [restaurant, operation, JSON.stringify(payload)]));
  const editorData = async () => editorDataSchema.parse(await asUser(owner, () => scalar("select public.get_editor_menu($1)", [restaurant])));
  const state = async () => asUser(owner, () => scalar("select public.get_restrofuel_menu_state($1)", [restaurant]));
  const stage = async snap => scalar("select public.stage_restrofuel_snapshot($1,'active',$2::jsonb,$3::jsonb)", [linkId, JSON.stringify(snap), JSON.stringify(summarize(snap, await state()))]);
  const review = async (user = owner) => syncReviewSchema.parse(await asUser(user, () => scalar("select public.get_restrofuel_sync($1)", [restaurant])));
  async function apply(snap, { mode = "merge", publish = false, user = owner } = {}) {
    const pending = (await review()).pending;
    const menu = await editorData();
    const plan = planSync({ snapshot: snap, state: await state(), categories: menu.categories, mode, publish, published: menu.restaurant.status === "PUBLISHED" });
    return asUser(user, () => scalar("select public.apply_restrofuel_sync($1,$2,$3::jsonb)", [restaurant, pending.id, JSON.stringify(plan)]));
  }
  const items = async () => (await editorData()).categories.flatMap(category => category.items.map(entry => ({ ...entry, category: category.name })));
  const find = async name => (await items()).find(entry => entry.name === name);

  await t.test("only an owner or manager can connect, and the secret never comes back", async () => {
    const save = user => asUser(user, () => db.query("select public.save_restrofuel_link($1,$2,'https://bluebird.kree.com.np','bluebird','v1.cipher','active')", [restaurant, linkId]));
    await assert.rejects(save(editor), error => error.code === "42501");
    await assert.rejects(save(stranger), error => error.code === "P0002");
    await save(owner);
    const status = await review();
    assert.equal(status.link.status, "ACTIVE");
    assert.equal(JSON.stringify(status).includes("v1.cipher"), false);
    await asUser(stranger, () => assert.rejects(db.query("select public.get_restrofuel_sync($1)", [restaurant]), error => error.code === "42501"));
    await asUser(owner, () => assert.rejects(db.query("select public.get_restrofuel_link($1)", [linkId]), error => error.code === "42501"));
    await asUser(owner, () => assert.rejects(db.query("select public.stage_restrofuel_snapshot($1,'active',null,null)", [linkId]), error => error.code === "42501"));
  });

  const first = snapshot([
    item("10", { name: "Chicken Momo", price: 250, addons: [{ name: "Extra achar", price: 30 }] }),
    item("11", { name: "Veg Momo", price: 180, isVeg: true }),
    item("20", { name: "Coke", categoryRef: "2", price: 80 }),
  ]);

  await t.test("the first sync creates the menu and can publish it", async () => {
    await mutate("saveCategory", { name: "Momo", name_ne: null, is_visible: true, parent_id: null });
    const momo = (await editorData()).categories[0].id;
    await mutate("saveItem", { category_id: momo, name: "Chicken momo", name_ne: "कुखुरा मःम", description: null, description_ne: null,
      price_minor: 20000, variants: [], is_available: true, diet: null, spice_level: 2, confirm_prices: true });
    await mutate("saveItem", { category_id: momo, name: "House special", name_ne: null, description: null, description_ne: null,
      price_minor: 50000, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: true });

    assert.equal((await stage(first)).status, "staged");
    assert.equal((await review()).pending.summary.added.length, 3);
    await assert.rejects(apply(first, { user: editor }), error => error.code === "42501");
    await apply(first, { publish: true });

    const menu = await editorData();
    assert.equal(menu.restaurant.status, "PUBLISHED");
    assert.deepEqual(menu.categories.map(category => category.name), ["Momo", "Drinks"], "existing Momo category reused");
    const chicken = await find("Chicken Momo");
    assert.equal(chicken.name_ne, "कुखुरा मःम", "matched by name, owner's Nepali kept");
    assert.equal(chicken.spice_level, 2);
    assert.equal(chicken.price_minor, 25000);
    assert.deepEqual(chicken.details.addon_groups.map(group => [group.name, group.options.map(option => option.price_minor)]), [["Add-ons", [3000]]]);
    assert.equal((await find("Veg Momo")).diet, "VEG");
    assert.ok(await find("House special"), "merge keeps the owner's own items");
    assert.equal((await review()).pending, null);
    const applied = await scalar("select id from private.restrofuel_snapshots where status='APPLIED'");
    await asUser(owner, () => assert.rejects(db.query("select public.apply_restrofuel_sync($1,$2,'[]'::jsonb)", [restaurant, applied]), /already handled/));
  });

  await t.test("a re-sync keeps owner edits unless RestroFuel changed the same field", async () => {
    const coke = await find("Coke");
    await mutate("saveItem", { id: coke.id, category_id: coke.category_id, name: "Coca-Cola", name_ne: null, description: "Chilled", description_ne: null,
      price_minor: 9000, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: true });
    const chicken = await find("Chicken Momo");
    await mutate("itemVisibility", { id: chicken.id, visible: false });

    const second = snapshot([
      item("10", { name: "Chicken Momo", price: 260, addons: [{ name: "Extra achar", price: 30 }] }),
      item("20", { name: "Coke", categoryRef: "2", price: 80, isAvailable: false }),
      item("30", { name: "Lassi", categoryRef: "2", price: 120 }),
    ], [{ ref: "1", name: "Momo", description: null, sortOrder: 0 }, { ref: "2", name: "Beverages", description: null, sortOrder: 1 }]);
    await stage(second);
    const { summary } = (await review()).pending;
    assert.deepEqual(summary.added.map(entry => entry.name), ["Lassi"]);
    assert.deepEqual(summary.changed.map(entry => [entry.name, entry.fields.map(change => change.field)]), [["Chicken Momo", ["price_minor"]], ["Coke", ["is_available"]]]);
    assert.deepEqual(summary.removed.map(entry => entry.name), ["Veg Momo"]);
    assert.deepEqual(summary.renamedCategories, [{ from: "Drinks", to: "Beverages" }]);
    await apply(second);

    const cola = await find("Coca-Cola");
    assert.equal(cola.price_minor, 9000, "owner's price kept: RestroFuel's price did not change");
    assert.equal(cola.description, "Chilled");
    assert.equal(cola.is_available, false, "availability changed in RestroFuel");
    assert.equal(cola.category, "Beverages");
    const updated = await find("Chicken Momo");
    assert.equal(updated.price_minor, 26000);
    assert.equal(updated.is_visible, false, "owner's hide kept");
    assert.equal((await find("Veg Momo")).is_visible, false, "removed in RestroFuel: hidden, not deleted");
    assert.ok(await find("Lassi"));
  });

  await t.test("items the owner deleted are not re-created, and nothing to do stages nothing", async () => {
    const lassi = await find("Lassi");
    await mutate("delete", { kind: "item", id: lassi.id });
    const third = snapshot([
      item("10", { name: "Chicken Momo", price: 260, addons: [{ name: "Extra achar", price: 30 }] }),
      item("11", { name: "Veg Momo", price: 180, isVeg: true }),
      item("20", { name: "Coke", categoryRef: "2", price: 80, isAvailable: false }),
      item("30", { name: "Lassi", categoryRef: "2", price: 120 }),
    ], [{ ref: "1", name: "Momo", description: null, sortOrder: 0 }, { ref: "2", name: "Beverages", description: null, sortOrder: 1 }]);
    await stage(third);
    assert.deepEqual((await review()).pending.summary.restored.map(entry => entry.name), ["Veg Momo"]);
    await apply(third);
    assert.equal(await find("Lassi"), undefined);
    assert.equal((await find("Veg Momo")).is_visible, true, "back in RestroFuel: shown again");
    assert.equal(isEmptySummary(summarize(third, await state())), true);
  });

  await t.test("dismissing, disconnecting and replacing", async () => {
    await stage(snapshot([item("40", { name: "Tea", categoryRef: "2" })], [{ ref: "2", name: "Beverages", description: null, sortOrder: 0 }]));
    const pending = (await review()).pending.id;
    await asUser(owner, () => db.query("select public.dismiss_restrofuel_sync($1,$2)", [restaurant, pending]));
    assert.equal((await review()).pending, null);

    const only = snapshot([item("20", { name: "Coke", categoryRef: "2", price: 80, isAvailable: false })], [{ ref: "2", name: "Beverages", description: null, sortOrder: 0 }]);
    await stage(only);
    await apply(only, { mode: "replace" });
    const names = (await items()).map(entry => entry.name).sort();
    assert.deepEqual(names, ["Chicken Momo", "Coca-Cola", "Veg Momo"], "the owner's own item was deleted; synced ones only hidden");

    await stage(only);
    const ended = await asUser(owner, () => scalar("select public.disconnect_restrofuel($1)", [restaurant]));
    assert.equal(ended.secretCipher, "v1.cipher");
    assert.equal((await review()).pending, null);
    await assert.rejects(stage(only), /Not connected/);
    assert.equal(await scalar("select count(*)::int from public.audit_events where action like 'restrofuel.%'"), 6, "connect, four applies, disconnect");
  });
});
