import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("photo review: admins approve or reject shared photos", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));

  const [admin, owner] = [randomUUID(), randomUUID()];
  await db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'a@x.com',now()),($2,'o@x.com',now())", [admin, owner]);
  await db.query("insert into private.super_admins values($1)", [admin]);
  async function asUser(id, fn) {
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    try { return await fn(); }
    finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const restaurant = await asUser(owner, () => scalar("select public.create_restaurant('Cafe','cafe-review')"));
  const dish = await scalar("select id from public.dishes where status='ACTIVE' order by slug limit 1");
  const asset = async (visibility, dishId) => scalar(
    `insert into public.media_assets(public_id,version,width,height,sha256,source,owner_restaurant_id,visibility,dish_id)
     values($1,1,800,600,$2,'USER',$3,$4,$5) returning id`, [`qrmenu/${restaurant}/${randomUUID()}`, randomUUID().replaceAll("-", "").repeat(2), restaurant, visibility, dishId]);
  const review = (user, id, decision, dishId = null) => asUser(user, () => db.query("select public.admin_review_photo($1,$2,$3)", [id, decision, dishId]));
  const visibility = async id => scalar("select visibility from public.media_assets where id=$1", [id]);

  await t.test("only super admins can list or review", async () => {
    const id = await asset("PENDING", dish);
    await asUser(owner, () => assert.rejects(db.query("select public.admin_list_photo_reviews('PENDING',1,20)"), error => error.code === "42501"));
    await assert.rejects(review(owner, id, "APPROVE"), error => error.code === "42501");
    await db.query("delete from public.media_assets where id=$1", [id]);
  });

  await t.test("approving publishes the photo for its dish", async () => {
    const id = await asset("PENDING", dish);
    const queue = await asUser(admin, () => scalar("select public.admin_list_photo_reviews('PENDING',1,20)"));
    assert.equal(queue.total, 1);
    assert.equal(queue.rows[0].restaurantSlug, "cafe-review");
    await review(admin, id, "APPROVE");
    assert.equal(await visibility(id), "PUBLIC");
    assert.equal(await scalar("select count(*)::int from public.audit_events where action='admin.photo.approve'"), 1);
  });

  await t.test("approval needs an active dish, which the admin can supply", async () => {
    const id = await asset("PENDING", null);
    await assert.rejects(review(admin, id, "APPROVE"), /Choose a dish/);
    await review(admin, id, "APPROVE", dish);
    assert.equal(await scalar("select dish_id from public.media_assets where id=$1", [id]), dish);
  });

  await t.test("rejecting hides the photo and can be reversed", async () => {
    const id = await asset("PENDING", dish);
    await review(admin, id, "REJECT");
    assert.equal(await visibility(id), "REJECTED");
    await review(admin, id, "APPROVE");
    assert.equal(await visibility(id), "PUBLIC");
  });

  await t.test("private photos and unknown ids are not reviewable", async () => {
    const id = await asset("PRIVATE", dish);
    await assert.rejects(review(admin, id, "APPROVE"), /Photo not found/);
    await assert.rejects(review(admin, id, "SHRUG"), /Invalid decision/);
  });
});

test("curated photos: admins add, list and remove them per dish", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now(),
      last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  const [admin, user] = [randomUUID(), randomUUID()];
  await db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'a@x.com',now()),($2,'u@x.com',now())", [admin, user]);
  await db.query("insert into private.super_admins values($1)", [admin]);
  const as = async (id, sql, params) => {
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    try { return Object.values((await db.query(sql, params)).rows[0] ?? {})[0]; }
    finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  };
  const dish = (await db.query("select id from public.dishes where status='ACTIVE' order by slug limit 1")).rows[0].id;
  const add = (id, publicId, sha) => as(id, "select public.admin_add_curated_photo($1,$2,1700000000,1200,900,$3)", [dish, publicId, sha]);
  const path = () => `library/${dish}/${randomUUID()}`;
  const sha = "c".repeat(64);

  await t.test("only admins can add, and the path must belong to the dish", async () => {
    await assert.rejects(add(user, path(), sha), error => error.code === "42501");
    await assert.rejects(add(admin, `library/${randomUUID()}/${randomUUID()}`, sha), /Invalid photo/);
    await assert.rejects(as(admin, "select public.admin_add_curated_photo($1,$2,1,10,10,$3)", [randomUUID(), path(), sha]), /Dish not found/);
  });

  await t.test("a curated photo is public at once, duplicates are reported, and removal hides it", async () => {
    const first = await add(admin, path(), sha);
    assert.equal(first.duplicate, false);
    assert.equal((await add(admin, path(), sha)).duplicate, true);
    const photos = await as(admin, "select public.admin_list_dish_photos($1)", [dish]);
    assert.deepEqual(photos.map(photo => photo.source), ["CURATED"]);
    await as(admin, "select public.admin_review_photo($1,'REJECT',null)", [first.id]);
    assert.deepEqual(await as(admin, "select public.admin_list_dish_photos($1)", [dish]), []);
    await assert.rejects(as(user, "select public.admin_list_dish_photos($1)", [dish]), error => error.code === "42501");
  });
});
