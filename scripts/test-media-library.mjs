import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const hash = char => char.repeat(64);

test("media library: quotas, dedupe, sharing and cleanup protection", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));

  const [admin, ownerA, ownerB, editorA] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,'a@x.com',now()),($2,'oa@x.com',now()),($3,'ob@x.com',now()),($4,'ea@x.com',now())`, [admin, ownerA, ownerB, editorA]);
  await db.query("insert into private.super_admins values($1)", [admin]);
  async function asUser(id, fn) {
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    try { return await fn(); }
    finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const mutate = (user, restaurant, operation, payload) => asUser(user, () => scalar("select public.mutate_menu($1,$2,$3::jsonb)", [restaurant, operation, JSON.stringify(payload)]));
  const rejects = (user, restaurant, operation, payload, pattern) => assert.rejects(mutate(user, restaurant, operation, payload), pattern);

  const a = await asUser(ownerA, () => scalar("select public.create_restaurant('Cafe A','cafe-a')"));
  const b = await asUser(ownerB, () => scalar("select public.create_restaurant('Cafe B','cafe-b')"));
  await db.query("insert into public.memberships values($1,$2,'EDITOR')", [editorA, a]);
  const dish = await scalar("select id from public.dishes order by slug limit 1");
  const category = async restaurant => scalar("insert into public.menu_categories(restaurant_id,name) values($1,'Momo') returning id", [restaurant]);
  const item = async (restaurant, name) => scalar("insert into public.menu_items(restaurant_id,category_id,name,price_minor,dish_id) values($1,$2,$3,25000,$4) returning id", [restaurant, await category(restaurant), name, dish]);
  const itemA = await item(a, "Buff Momo"), itemB = await item(b, "Momo");

  async function uploadPhoto(user, restaurant, itemId, sha, extra = {}) {
    const reserved = JSON.parse(JSON.stringify(await mutate(user, restaurant, "reserveUpload", { kind: "item", item_id: itemId })));
    await mutate(user, restaurant, "attachImage", { upload_id: reserved.uploadId, version: 1700000000, sha256: sha, width: 800, height: 600, ...extra });
    return reserved;
  }

  await t.test("upload quota is per user per rolling week, with an admin default and per-user overrides", async () => {
    const reserve = (user, restaurant, itemId) => mutate(user, restaurant, "reserveUpload", { kind: "item", item_id: itemId });
    const limitOf = user => asUser(admin, () => scalar("select public.admin_get_user_upload_limit($1)", [user]));
    await db.query("insert into public.memberships values($1,$2,'OWNER')", [ownerA, b]);
    assert.equal(await scalar("select private.weekly_upload_limit($1)", [ownerA]), 50);
    for (let i = 0; i < 25; i++) await reserve(ownerA, a, itemA);
    for (let i = 0; i < 25; i++) await reserve(ownerA, b, itemB);
    await rejects(ownerA, b, "reserveUpload", { kind: "item", item_id: itemB }, /Weekly photo upload limit/);
    await rejects(ownerA, a, "reserveUpload", { kind: "logo" }, /Weekly photo upload limit/);
    await reserve(editorA, a, itemA);
    await reserve(admin, a, itemA);

    await db.query("update private.menu_uploads set created_at = now() - interval '8 days' where actor_id=$1 and kind='item' and restaurant_id=$2", [ownerA, b]);
    await reserve(ownerA, a, itemA);
    await db.query("update private.menu_uploads set created_at = now() where actor_id=$1", [ownerA]);

    await asUser(ownerA, () => assert.rejects(db.query("select public.admin_set_user_upload_limit($1,100)", [ownerA]), error => error.code === "42501"));
    await asUser(ownerA, () => assert.rejects(db.query("select public.admin_set_default_upload_limit(100)"), error => error.code === "42501"));
    await asUser(ownerA, () => assert.rejects(db.query("select public.admin_get_user_upload_limit($1)", [ownerA]), error => error.code === "42501"));
    await asUser(admin, () => db.query("select public.admin_set_user_upload_limit($1,60)", [ownerA]));
    assert.deepEqual(await limitOf(ownerA), { limit: 60, defaultLimit: 50, overridden: true, usedThisWeek: 51 });
    await reserve(ownerA, a, itemA);

    await asUser(admin, () => db.query("select public.admin_set_user_upload_limit($1,null)", [ownerA]));
    await asUser(admin, () => db.query("select public.admin_set_default_upload_limit(52)"));
    assert.deepEqual(await asUser(admin, () => scalar("select public.admin_get_upload_settings()")), { weeklyLimit: 52 });
    assert.deepEqual(await limitOf(ownerA), { limit: 52, defaultLimit: 52, overridden: false, usedThisWeek: 52 });
    await rejects(ownerA, a, "reserveUpload", { kind: "item", item_id: itemA }, /Weekly photo upload limit/);
    await asUser(admin, () => assert.rejects(db.query("select public.admin_set_default_upload_limit(0)"), error => error.code === "23514"));
    assert.equal(await limitOf(randomUUID()), null);
    assert.equal(await scalar("select count(*)::int from public.audit_events where action like 'admin.upload_limit.%'"), 3);

    await asUser(admin, () => db.query("select public.admin_set_default_upload_limit(50)"));
    await db.query("delete from public.memberships where user_id=$1 and restaurant_id=$2", [ownerA, b]);
    await db.query("delete from private.menu_uploads where restaurant_id=$1", [b]);
    await db.query("delete from private.menu_uploads where restaurant_id=$1", [a]);
  });

  let own;
  await t.test("an attached item photo becomes a private asset linked to the item", async () => {
    const reserved = await uploadPhoto(ownerA, a, itemA, hash("a"));
    const row = (await db.query("select image_asset_id,image_public_id,image_version from public.menu_items where id=$1", [itemA])).rows[0];
    assert.equal(row.image_public_id, reserved.publicId);
    assert.equal(Number(row.image_version), 1700000000);
    own = (await db.query("select * from public.media_assets where id=$1", [row.image_asset_id])).rows[0];
    assert.equal(own.visibility, "PRIVATE");
    assert.equal(own.owner_restaurant_id, a);
    assert.equal(own.dish_id, dish);
  });

  await t.test("dedupe finds own assets, never another restaurant's private ones", async () => {
    const lookup = (user, restaurant, sha) => asUser(user, () => scalar("select public.find_reusable_asset($1,$2)", [restaurant, sha]));
    assert.equal((await lookup(ownerA, a, hash("a"))).id, own.id);
    assert.equal(await lookup(ownerB, b, hash("a")), null);
    assert.equal(await lookup(ownerA, a, hash("f")), null);
    await asUser(ownerB, () => assert.rejects(db.query("select public.find_reusable_asset($1,$2)", [a, hash("a")]), error => error.code === "42501"));
  });

  await t.test("the same photo can be uploaded separately by two restaurants", async () => {
    await uploadPhoto(ownerB, b, itemB, hash("a"));
    assert.equal(await scalar("select count(*)::int from public.media_assets where sha256=$1", [hash("a")]), 2);
  });

  await t.test("sharing needs a manager, and only public assets can be used by others", async () => {
    await rejects(editorA, a, "shareAsset", { asset_id: own.id, share: true }, /permitted|Editing/);
    await mutate(ownerA, a, "shareAsset", { asset_id: own.id, share: true });
    assert.equal(await scalar("select visibility from public.media_assets where id=$1", [own.id]), "PENDING");
    await rejects(ownerB, b, "useAsset", { item_id: itemB, asset_id: own.id }, /Photo not available/);
    await rejects(ownerB, b, "shareAsset", { asset_id: own.id, share: false }, /can’t be changed/);
    await mutate(ownerA, a, "shareAsset", { asset_id: own.id, share: false });
    await mutate(ownerA, a, "shareAsset", { asset_id: own.id, share: true });
    await db.query("update public.media_assets set visibility='PUBLIC' where id=$1", [own.id]);
    await rejects(ownerA, a, "shareAsset", { asset_id: own.id, share: false }, /can’t be changed/);
  });

  await t.test("a public asset appears in the picker for the same dish and can be used without an upload", async () => {
    const options = await asUser(ownerB, () => scalar("select public.list_photo_options($1,$2)", [b, itemB]));
    assert.deepEqual(options.library.map(asset => asset.id), [own.id]);
    assert.equal(options.own.length, 1);
    await asUser(ownerA, () => assert.rejects(db.query("select public.list_photo_options($1,$2)", [b, itemB]), error => error.code === "42501"));
    await mutate(ownerB, b, "useAsset", { item_id: itemB, asset_id: own.id });
    const row = (await db.query("select image_asset_id,image_public_id from public.menu_items where id=$1", [itemB])).rows[0];
    assert.equal(row.image_asset_id, own.id);
    assert.equal(row.image_public_id, own.public_id);
    assert.equal(await scalar("select count(*)::int from private.menu_uploads where restaurant_id=$1", [b]), 1);
  });

  await t.test("cleanup never lists shared files or files another restaurant still shows", async () => {
    await db.query("update private.menu_uploads set created_at = now() - interval '3 hours'");
    const listed = (await scalar("select public.list_unreferenced_uploads(50)")).map(row => row.publicId);
    assert.ok(!listed.includes(own.public_id));
    const stale = await uploadPhoto(ownerA, a, itemA, hash("c"));
    await db.query("update private.menu_uploads set created_at = now() - interval '3 hours'");
    await mutate(ownerA, a, "removeImage", { kind: "item", item_id: itemA });
    assert.equal(await scalar("select image_asset_id is null from public.menu_items where id=$1", [itemA]), true);
    const after = (await scalar("select public.list_unreferenced_uploads(50)"));
    const replaced = (await db.query("select public_id from public.media_assets where owner_restaurant_id=$1", [b])).rows[0].public_id;
    assert.deepEqual(after.map(row => row.publicId).sort(), [stale.publicId, replaced].sort());
    await db.query("select public.mark_uploads_discarded($1)", [after.map(row => row.id)]);
    assert.equal(await scalar("select count(*)::int from public.media_assets where sha256=$1", [hash("c")]), 0);
  });

  await t.test("deleting an account keeps its public assets and removes the rest", async () => {
    await db.query("update public.profiles set deletion_requested_at = now() - interval '15 days' where id=$1", [ownerA]);
    assert.deepEqual(await scalar("select public.list_shared_asset_ids($1)", [[a]]), [own.public_id]);
    await db.query("select public.purge_account($1)", [ownerA]);
    const asset = (await db.query("select owner_restaurant_id,visibility from public.media_assets where id=$1", [own.id])).rows[0];
    assert.equal(asset.visibility, "PUBLIC");
    assert.equal(asset.owner_restaurant_id, null);
    assert.equal(await scalar("select count(*)::int from public.menu_items where id=$1", [itemB]), 1);
  });
});
