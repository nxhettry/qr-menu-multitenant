import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("rate limits, account deletion, export, abuse reports and upload cleanup", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));

  const admin = randomUUID(), owner = randomUUID(), partner = randomUUID();
  await db.query(`insert into auth.users(id,email,email_confirmed_at) values ($1,'admin@example.com',now()),($2,'owner@example.com',now()),($3,'partner@example.com',now())`, [admin, owner, partner]);
  await db.query("insert into private.super_admins values($1)", [admin]);
  async function asUser(id, fn) {
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    try { return await fn(); }
    finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const denied = error => error.code === "42501";

  await t.test("rate limit counts per key and is service only", async () => {
    for (let i = 0; i < 3; i++) assert.equal(await scalar("select public.rate_limit_hit('a',3,60)"), 0);
    assert.ok(await scalar("select public.rate_limit_hit('a',3,60)") > 0);
    assert.equal(await scalar("select public.rate_limit_hit('b',3,60)"), 0);
    await assert.rejects(db.query("select public.rate_limit_hit('a',0,60)"), error => error.code === "22023");
    for (const id of [null, owner]) await asUser(id, () => assert.rejects(db.query("select public.rate_limit_hit('a',3,60)"), denied));
    await db.query("insert into private.rate_limits values('old', now() - interval '3 days', 1)");
    assert.equal((await scalar("select public.run_maintenance()")).rateLimitsRemoved, 1);
  });

  const solo = await asUser(owner, () => scalar("select public.create_restaurant('Momo Corner','momo-corner')"));
  const shared = await asUser(owner, () => scalar("select public.create_restaurant('Shared Cafe','shared-cafe')"));
  await db.query("insert into public.memberships values($1,$2,'OWNER')", [partner, shared]);
  await db.query("update public.restaurants set status='PUBLISHED' where id=any($1)", [[solo, shared]]);
  const category = await scalar("insert into public.menu_categories(restaurant_id,name) values($1,'Momo') returning id", [solo]);
  await db.query("insert into public.menu_items(restaurant_id,category_id,name,price_minor) values($1,$2,'Buff Momo',25000)", [solo, category]);

  await t.test("export returns only the caller's data", async () => {
    const data = await asUser(owner, () => scalar("select public.export_account_data()"));
    assert.equal(data.account.email, "owner@example.com");
    assert.equal(data.restaurants.length, 2);
    const momo = data.restaurants.find(r => r.id === solo);
    assert.equal(momo.categories[0].items[0].name, "Buff Momo");
    await asUser(null, () => assert.rejects(db.query("select public.export_account_data()"), denied));
    assert.equal((await asUser(admin, () => scalar("select public.export_account_data()"))).restaurants.length, 0);
  });

  await t.test("abuse reports only attach to published menus and are admin-managed", async () => {
    assert.equal(await scalar("select public.report_menu('momo-corner','SPAM','x','a@b.c')"), true);
    assert.equal(await scalar("select public.report_menu('missing','SPAM','','')"), false);
    await asUser(owner, () => assert.rejects(db.query("select public.report_menu('momo-corner','SPAM','','')"), denied));
    await asUser(owner, () => assert.rejects(db.query("select public.admin_list_abuse_reports(null,1,20)"), denied));
    const page = await asUser(admin, () => scalar("select public.admin_list_abuse_reports('OPEN',1,20)"));
    assert.equal(page.total, 1);
    await asUser(admin, () => db.query("select public.admin_resolve_abuse_report($1,'RESOLVED')", [page.rows[0].id]));
    assert.equal(await scalar("select status from public.abuse_reports"), "RESOLVED");
    await assert.rejects(db.query("select public.report_menu('momo-corner','BAD','','')"));
  });

  await t.test("unreferenced uploads are listed once and then marked", async () => {
    const used = randomUUID(), stale = randomUUID(), fresh = randomUUID();
    for (const [id, age] of [[used, "2 hours"], [stale, "2 hours"], [fresh, "1 minute"]]) {
      await db.query(`insert into private.menu_uploads(id,restaurant_id,actor_id,kind,created_at) values($1,$2,$3,'logo',now() - interval '${age}')`, [id, solo, owner]);
    }
    await db.query("update public.restaurants set logo_public_id=$2 where id=$1", [solo, `qrmenu/${solo}/${used}`]);
    const listed = await scalar("select public.list_unreferenced_uploads(50)");
    assert.deepEqual(listed.map(row => row.id), [stale]);
    assert.equal(listed[0].publicId, `qrmenu/${solo}/${stale}`);
    assert.equal(await scalar("select public.mark_uploads_discarded($1)", [[stale]]), 1);
    assert.deepEqual(await scalar("select public.list_unreferenced_uploads(50)"), []);
  });

  await t.test("deletion hides solely owned restaurants, releases slugs, and can be cancelled", async () => {
    const released = await asUser(owner, () => scalar("select public.request_account_deletion()"));
    assert.deepEqual(released.map(r => r.slug), ["momo-corner"]);
    const row = (await db.query("select slug,status,deleted_at from public.restaurants where id=$1", [solo])).rows[0];
    assert.match(row.slug, /^removed-[0-9a-f]{12}$/);
    assert.equal(row.status, "DRAFT");
    assert.ok(row.deleted_at);
    assert.equal(await scalar("select count(*)::int from private.slug_reservations where slug='momo-corner'"), 0);
    assert.equal(await scalar("select (public.get_public_menu('momo-corner')) is null"), true);
    assert.equal(await scalar("select deleted_at is null from public.restaurants where id=$1", [shared]), true);
    const reuse = await asUser(partner, () => scalar("select public.create_restaurant('Momo Again','momo-corner')"));
    assert.ok(reuse);

    assert.equal(await asUser(owner, () => scalar("select public.cancel_account_deletion()")), 1);
    assert.equal(await scalar("select deleted_at is null from public.restaurants where id=$1", [solo]), true);
    assert.equal(await scalar("select deletion_requested_at is null from public.profiles where id=$1", [owner]), true);
  });

  await t.test("purge waits for the grace period and removes only solely owned data", async () => {
    await asUser(owner, () => db.query("select public.request_account_deletion()"));
    assert.deepEqual(await scalar("select public.list_accounts_due_for_purge(10)"), []);
    await assert.rejects(db.query("select public.purge_account($1)", [owner]), error => error.code === "55000");
    await db.query("update public.profiles set deletion_requested_at = now() - interval '15 days' where id=$1", [owner]);
    const due = await scalar("select public.list_accounts_due_for_purge(10)");
    assert.deepEqual(due, [{ userId: owner, restaurantIds: [solo] }]);
    for (const id of [null, owner]) await asUser(id, () => assert.rejects(db.query("select public.purge_account($1)", [owner]), denied));
    await db.query("select public.purge_account($1)", [owner]);
    assert.equal(await scalar("select count(*)::int from auth.users where id=$1", [owner]), 0);
    assert.equal(await scalar("select count(*)::int from public.restaurants where id=$1", [solo]), 0);
    assert.equal(await scalar("select count(*)::int from public.restaurants where id=$1", [shared]), 1);
    assert.equal(await scalar("select count(*)::int from public.menu_items where restaurant_id=$1", [solo]), 0);
  });
});
