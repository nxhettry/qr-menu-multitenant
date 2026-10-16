import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

test("foundation migration and tenant security (embedded PostgreSQL)", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/202610160001_foundation.sql", import.meta.url), "utf8"));
  const ownerA = randomUUID(), ownerB = randomUUID(), editor = randomUUID(), unverified = randomUUID();
  for (const id of [ownerA, ownerB, editor]) await db.query("insert into auth.users values($1,now())", [id]);
  await db.query("insert into auth.users values($1,null)", [unverified]);
  async function asUser(id, fn) {
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    try { return await fn(); }
    finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  async function scalar(sql, params = []) { return Object.values((await db.query(sql, params)).rows[0])[0]; }
  const denied = error => error.code === "42501";
  let restaurantA, restaurantB;
  await t.test("verified owners atomically receive restaurant, owner membership, and 30-day trial", async () => {
    restaurantA = await asUser(ownerA, () => scalar("select public.create_restaurant($1,$2)", ["Restaurant A", "tenant-alpha"]));
    restaurantB = await asUser(ownerB, () => scalar("select public.create_restaurant($1,$2)", ["Restaurant B", "tenant-beta"]));
    assert.equal(await scalar("select count(*)::int from public.memberships where restaurant_id=$1 and user_id=$2 and role='OWNER'", [restaurantA, ownerA]), 1);
    assert.equal(await scalar("select count(*)::int from public.subscriptions where restaurant_id=$1 and status='TRIAL' and trial_ends_at > now()+interval '29 days'", [restaurantA]), 1);
    await asUser(unverified, () => assert.rejects(db.query("select public.create_restaurant('Unverified','not-verified')"), denied));
  });

  const categoryA = randomUUID(), categoryB = randomUUID(), itemA = randomUUID(), itemB = randomUUID();
  const variantItem = randomUUID(), variant = randomUUID(), importB = randomUUID();
  for (const [user, restaurant, category, item] of [[ownerA, restaurantA, categoryA, itemA], [ownerB, restaurantB, categoryB, itemB]]) {
    await asUser(user, async () => {
      await db.query("insert into public.menu_categories(id,restaurant_id,name) values($1,$2,'Momo')", [category, restaurant]);
      await db.query("insert into public.menu_items(id,restaurant_id,category_id,name,price_minor) values($1,$2,$3,'Buff Momo',18000)", [item, restaurant, category]);
    });
  }
  await asUser(ownerB, () => db.transaction(async tx => {
    await tx.query("insert into public.menu_items(id,restaurant_id,category_id,name,uses_variants) values($1,$2,$3,'Momo Variants',true)", [variantItem, restaurantB, categoryB]);
    await tx.query("insert into public.menu_item_variants(id,restaurant_id,item_id,name,price_minor) values($1,$2,$3,'Veg',15000)", [variant, restaurantB, variantItem]);
  }));
  await asUser(ownerB, () => db.query("insert into public.menu_imports(id,restaurant_id,source_type) values($1,$2,'CSV')", [importB, restaurantB]));

  await t.test("every tenant-owned table hides another tenant; menu CRUD cannot cross tenants", async () => {
    await asUser(ownerA, async () => {
      for (const table of ["memberships", "subscriptions", "slug_history", "menu_categories", "menu_items", "menu_item_variants", "menu_imports", "audit_events"]) {
        const projection = table === "subscriptions" ? "restaurant_id" : "*";
        assert.equal((await db.query(`select ${projection} from public.${table} where restaurant_id=$1`, [restaurantB])).rows.length, 0, table);
      }
      assert.equal((await db.query("select * from public.restaurants where id=$1", [restaurantB])).rows.length, 0);
      for (const [table, id, column, value] of [["menu_categories", categoryB, "name", "stolen"], ["menu_items", itemB, "name", "stolen"], ["menu_item_variants", variant, "name", "stolen"], ["menu_imports", importB, "status", "FAILED"]]) {
        assert.equal((await db.query(`update public.${table} set ${column}=$1 where id=$2 returning id`, [value, id])).rows.length, 0, table);
        assert.equal((await db.query(`delete from public.${table} where id=$1 returning id`, [id])).rows.length, 0, table);
      }
      for (const [table, sql, params] of [
        ["categories", "insert into public.menu_categories(restaurant_id,name) values($1,'bad')", [restaurantB]],
        ["items", "insert into public.menu_items(restaurant_id,category_id,name,price_minor) values($1,$2,'bad',100)", [restaurantB, categoryB]],
        ["variants", "insert into public.menu_item_variants(restaurant_id,item_id,name,price_minor) values($1,$2,'bad',100)", [restaurantB, variantItem]],
        ["imports", "insert into public.menu_imports(restaurant_id,source_type) values($1,'CSV')", [restaurantB]],
      ]) await assert.rejects(db.query(sql, params), denied, table);
    });
  });
  await t.test("composite foreign keys reject cross-tenant category and item references", async () => {
    await asUser(ownerA, async () => {
      await assert.rejects(db.query("insert into public.menu_items(restaurant_id,category_id,name,price_minor) values($1,$2,'bad',100)", [restaurantA, categoryB]), error => error.code === "23503");
      await assert.rejects(db.query("insert into public.menu_item_variants(restaurant_id,item_id,name,price_minor) values($1,$2,'bad',100)", [restaurantA, variantItem]), error => error.code === "23503");
    });
  });
  await t.test("clients cannot grant membership, change billing/status, alter QR codes, or become admin", async () => {
    await asUser(ownerA, async () => {
      await assert.rejects(db.query("insert into public.memberships(user_id,restaurant_id,role) values($1,$2,'OWNER')", [ownerA, restaurantB]), denied);
      await assert.rejects(db.query("update public.memberships set role='OWNER'"), denied);
      await assert.rejects(db.query("update public.subscriptions set status='ACTIVE'"), denied);
      await assert.rejects(db.query("select notes from public.subscriptions"), denied);
      await assert.rejects(db.query("update public.restaurants set status='PUBLISHED' where id=$1", [restaurantA]), denied);
      await assert.rejects(db.query("update public.restaurants set short_code='changed' where id=$1", [restaurantA]), denied);
      await assert.rejects(db.query("insert into private.super_admins values($1)", [ownerA]), denied);
      await assert.rejects(db.query("insert into public.audit_events(action) values('fake')"), denied);
    });
  });
  await t.test("single-price/variant invariants and nonnegative integer prices hold at commit", async () => {
    await asUser(ownerA, async () => {
      await assert.rejects(db.query("insert into public.menu_items(restaurant_id,category_id,name,price_minor) values($1,$2,'bad',-1)", [restaurantA, categoryA]), error => error.code === "23514");
      await assert.rejects(db.query("insert into public.menu_items(restaurant_id,category_id,name,uses_variants) values($1,$2,'empty variants',true)", [restaurantA, categoryA]), error => error.code === "23514");
      await assert.rejects(db.query("insert into public.menu_item_variants(restaurant_id,item_id,name,price_minor) values($1,$2,'bad',100)", [restaurantA, itemA]), error => error.code === "23514");
    });
    await asUser(ownerB, () => assert.rejects(db.query("delete from public.menu_item_variants where id=$1", [variant]), error => error.code === "23514"));
  });
  await t.test("slug history remains reserved and immutable QR codes survive rename", async () => {
    const code = await scalar("select short_code from public.restaurants where id=$1", [restaurantA]);
    await asUser(ownerA, async () => {
      await db.query("update public.restaurants set slug='tenant-alpha-renamed' where id=$1", [restaurantA]);
      await assert.rejects(db.query("update public.restaurants set slug='tenant-beta' where id=$1", [restaurantA]), error => error.code === "23505");
      await assert.rejects(db.query("select public.create_restaurant('Reserved','dashboard')"), error => error.code === "23514");
    });
    await asUser(ownerB, () => assert.rejects(db.query("select public.create_restaurant('Stolen history','tenant-alpha')"), error => error.code === "23505"));
    await asUser(null, async () => {
      assert.equal(await scalar("select public.resolve_menu_code($1)", [code]), "tenant-alpha-renamed");
      assert.equal(await scalar("select public.resolve_old_slug('tenant-alpha')"), "tenant-alpha-renamed");
    });
  });
  await t.test("anonymous access is restricted to the explicit public projection", async () => {
    await asUser(null, async () => {
      for (const table of ["profiles", "restaurants", "memberships", "subscriptions", "slug_history", "menu_categories", "menu_items", "menu_item_variants", "menu_imports", "audit_events"]) {
        await assert.rejects(db.query(`select * from public.${table}`), denied, table);
      }
      await assert.rejects(db.query("select public.create_restaurant('Anonymous','anonymous-tenant')"), denied);
      assert.deepEqual(await scalar("select public.get_public_menu('tenant-beta')"), { status: "UNAVAILABLE" });
    });
    await db.query("update public.restaurants set status='PUBLISHED' where id=$1", [restaurantB]);
    await asUser(null, async () => {
      const menu = await scalar("select public.get_public_menu('tenant-beta')");
      assert.equal(menu.status, "PUBLISHED");
      assert.equal(menu.categories[0].items.length, 2);
      assert(!JSON.stringify(menu).includes(ownerB));
      assert(!Object.hasOwn(menu, "subscription"));
      assert(!Object.hasOwn(menu, "memberships"));
    });
  });
  await t.test("editor permissions and suspension/edit locks are enforced inside the database", async () => {
    await db.query("insert into public.memberships values($1,$2,'EDITOR',now())", [editor, restaurantA]);
    await asUser(editor, async () => {
      assert.equal((await db.query("update public.restaurants set name='not allowed' where id=$1 returning id", [restaurantA])).rows.length, 0);
      assert.equal((await db.query("update public.menu_items set is_available=false where id=$1 returning id", [itemA])).rows.length, 1);
    });
    await db.query("update public.restaurants set status='SUSPENDED' where id=$1", [restaurantA]);
    await asUser(ownerA, async () => {
      assert.equal((await db.query("update public.menu_items set price_minor=500 where id=$1 returning id", [itemA])).rows.length, 0);
    });
    await db.query("update public.restaurants set status='DRAFT' where id=$1", [restaurantA]);
    await db.query("update public.subscriptions set editing_locked_at=now()-interval '1 day' where restaurant_id=$1", [restaurantA]);
    await asUser(ownerA, async () => {
      assert.equal((await db.query("delete from public.menu_items where id=$1 returning id", [itemA])).rows.length, 0);
      assert.equal((await db.query("select * from public.menu_items where id=$1", [itemA])).rows.length, 1);
    });
  });
});
