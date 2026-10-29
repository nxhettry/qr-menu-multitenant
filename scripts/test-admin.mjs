import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("super-admin portal, scan counters and terms consent", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));

  const admin = randomUUID(), owner = randomUUID(), other = randomUUID();
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
    ($1,'admin@example.com',now(),'{}'), ($2,'owner@example.com',now(),'{"terms_version":"2026-10-29"}'), ($3,'other@example.com',now(),'{"terms_version":"bogus"}')`, [admin, owner, other]);
  await db.query("insert into private.super_admins values($1)", [admin]);
  async function asUser(id, fn) {
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    try { return await fn(); }
    finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const denied = error => error.code === "42501";
  const restaurant = await asUser(owner, () => scalar("select public.create_restaurant('Momo Corner','momo-corner')"));
  const code = await scalar("select short_code from public.restaurants where id=$1", [restaurant]);

  await t.test("sign-up records only a valid terms version", async () => {
    const owners = (await db.query("select id,terms_version,terms_accepted_at from public.profiles where id = any($1)", [[owner, other]])).rows;
    const byId = Object.fromEntries(owners.map(row => [row.id, row]));
    assert.equal(byId[owner].terms_version, "2026-10-29");
    assert.ok(byId[owner].terms_accepted_at);
    assert.equal(byId[other].terms_version, null);
  });

  await t.test("non-admins cannot call admin operations", async () => {
    await asUser(owner, async () => {
      assert.equal(await scalar("select public.is_super_admin()"), false);
      for (const sql of ["select public.admin_overview()", "select public.admin_list_users(null,1,20)",
        "select public.admin_list_restaurants(null,null,1,20)", `select public.admin_get_user('${owner}')`,
        "select public.admin_list_events(null,null,null,25)", `select public.admin_set_restaurant_suspended('${restaurant}',true)`,
        `select public.admin_log_user_action('${other}','admin.user.banned')`]) await assert.rejects(db.query(sql), denied, sql);
    });
    await asUser(other, async () => assert.equal((await db.query("select id from public.restaurants where id=$1", [restaurant])).rows.length, 0));
    await asUser(null, () => assert.rejects(db.query("select public.admin_overview()"), denied));
  });

  await t.test("scans are counted per day and anonymous callers cannot read them", async () => {
    await asUser(null, async () => {
      await db.query("select public.record_menu_scan($1)", [code]);
      await db.query("select public.record_menu_scan($1)", [code]);
      await db.query("select public.record_menu_scan('missing')");
      await assert.rejects(db.query("select * from public.menu_scan_days"), denied);
    });
    assert.equal(await scalar("select sum(scans)::int from public.menu_scan_days where restaurant_id=$1", [restaurant]), 2);
  });

  await t.test("admins see paginated, searchable users and restaurants", async () => {
    await asUser(admin, async () => {
      assert.equal(await scalar("select public.is_super_admin()"), true);
      const overview = await scalar("select public.admin_overview()");
      assert.equal(overview.users.total, 3);
      assert.equal(overview.restaurants.total, 1);
      assert.equal(overview.scans.today, 2);
      const users = await scalar("select public.admin_list_users('momo',1,20)");
      assert.equal(users.total, 1);
      assert.equal(users.rows[0].email, "owner@example.com");
      assert.equal((await scalar("select public.admin_list_users('%',1,20)")).total, 0, "wildcards are escaped");
      const paged = await scalar("select public.admin_list_users(null,2,2)");
      assert.equal(paged.total, 3);
      assert.equal(paged.rows.length, 1);
      const restaurants = await scalar("select public.admin_list_restaurants(null,'DRAFT',1,20)");
      assert.equal(restaurants.rows[0].ownerEmail, "owner@example.com");
      assert.equal(restaurants.rows[0].scans30, 2);
      assert.equal((await scalar("select public.admin_get_user($1)", [owner])).restaurants[0].role, "OWNER");
      assert.equal((await scalar("select public.admin_get_restaurant($1)", [restaurant])).scans.total, 2);
    });
  });

  await t.test("admins edit any menu and suspension restores the previous status", async () => {
    await asUser(admin, async () => {
      await db.query("insert into public.menu_categories(restaurant_id,name) values($1,'Momo')", [restaurant]);
      assert.equal(await scalar("select public.admin_set_restaurant_suspended($1,true)", [restaurant]), "momo-corner");
      assert.equal(await scalar("select status from public.restaurants where id=$1", [restaurant]), "SUSPENDED");
      await db.query("update public.menu_categories set name='Momos' where restaurant_id=$1", [restaurant]);
    });
    await asUser(owner, () => assert.rejects(db.query("insert into public.menu_categories(restaurant_id,name) values($1,'Locked')", [restaurant]), denied));
    await asUser(admin, async () => {
      await db.query("select public.admin_set_restaurant_suspended($1,false)", [restaurant]);
      assert.equal(await scalar("select status from public.restaurants where id=$1", [restaurant]), "DRAFT");
      await db.query("select public.admin_log_user_action($1,'admin.user.banned')", [other]);
      await assert.rejects(db.query("select public.admin_log_user_action($1,'anything')", [other]), error => error.code === "23514");
      const events = await scalar("select public.admin_list_events(null,null,null,2)");
      assert.equal(events.length, 2);
      assert.equal(events[0].action, "admin.user.banned");
      const older = await scalar("select public.admin_list_events(null,$1,$2,50)", [events[1].createdAt, events[1].id]);
      assert.ok(older.every(event => !events.some(seen => seen.id === event.id)));
    });
  });
});
