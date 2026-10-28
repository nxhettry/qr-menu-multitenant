import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const calls = new Map();
const publicKey = "sb_publishable_public_menu_test_only";
let outage = false;
let app;
let output = "";
let mock;
const ownerId = randomUUID();
const owner = { id: ownerId, aud: "authenticated", role: "authenticated", email: "owner@example.test", email_confirmed_at: "2026-10-16T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-10-16T00:00:00Z" };
const accessToken = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: ownerId, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"), Buffer.from("test-auth-provider-signature").toString("base64url")].join(".");
const cookie = `sb-127-auth-token=base64-${Buffer.from(JSON.stringify({ access_token: accessToken, refresh_token: "test-only", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: owner })).toString("base64url")}`;
const appendOutput = chunk => { output = (output + chunk).slice(-16000); };

async function runNext(args, env) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], {
    env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);
  return child;
}

async function page(base, path) {
  const response = await fetch(base + path, { redirect: "manual" });
  const body = await response.text();
  return { response, body };
}

try {
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  await db.exec(await readFile(new URL("../supabase/migrations/202610160001_foundation.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610160002_owner_editor.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610160003_featured_menu.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610170001_bulk_menu.sql", import.meta.url), "utf8"));
  const { rows: [restaurant] } = await db.query("insert into public.restaurants(name,slug,status,phone,map_url,vat_percent,prices_include_vat) values('Live Kitchen','live-kitchen','PUBLISHED','+977 9801234567','https://maps.google.com/?q=Kathmandu',13,true) returning id,short_code");
  const { rows: [category] } = await db.query("insert into public.menu_categories(restaurant_id,name) values($1,'Lunch') returning id", [restaurant.id]);
  await db.query("insert into public.menu_items(restaurant_id,category_id,name,description,price_minor,is_available) values($1,$2,'Test thali','A fresh seasonal lunch.',18005,false)", [restaurant.id, category.id]);
  await db.query("update public.restaurants set logo_public_id=$2,logo_version=1,cover_public_id=$3,cover_version=1 where id=$1", [restaurant.id, `qrmenu/${restaurant.id}/${randomUUID()}`, `qrmenu/${restaurant.id}/${randomUUID()}`]);
  await db.query("update public.menu_items set image_public_id=$2,image_version=1 where restaurant_id=$1", [restaurant.id, `qrmenu/${restaurant.id}/${randomUUID()}`]);
  await db.query("insert into public.restaurants(name,slug,status) values('Other Kitchen','other-kitchen','PUBLISHED'),('Secret Draft Name','private-draft','DRAFT'),('Secret Suspended Name','paused-kitchen','SUSPENDED')");
  await db.query("insert into auth.users values($1,now())", [ownerId]);
  const draftId = (await db.query("select id from public.restaurants where slug='private-draft'")).rows[0].id;
  const otherId = (await db.query("select id from public.restaurants where slug='other-kitchen'")).rows[0].id;
  for (const tenant of [restaurant.id, draftId]) {
    await db.query("insert into public.memberships(user_id,restaurant_id,role) values($1,$2,'OWNER')", [ownerId, tenant]);
    await db.query("insert into public.subscriptions(restaurant_id) values($1)", [tenant]);
  }

  mock = createServer(async (request, response) => {
    try {
      if (outage) { response.writeHead(503).end(); return; }
      assert.equal(request.headers.apikey, publicKey);
      assert.equal(request.headers.cookie, undefined);
      const authenticated = request.headers.authorization === `Bearer ${accessToken}`;
      if (request.url === "/auth/v1/user") {
        response.writeHead(authenticated ? 200 : 401, { "Content-Type": "application/json" }).end(JSON.stringify(authenticated ? owner : { message: "Invalid test session" }));
        return;
      }
      if (request.url.startsWith("/auth/v1/logout")) {
        response.writeHead(authenticated ? 200 : 401, { "Content-Type": "application/json" }).end("{}");
        return;
      }
      assert(request.headers.authorization === `Bearer ${publicKey}` || authenticated);
      const functionName = request.url.split("?")[0].split("/").at(-1);
      const tables = { memberships: ["restaurant_id", "user_id", "role", "created_at"], restaurants: ["id", "name", "slug", "status", "deleted_at", "created_at"], subscriptions: ["restaurant_id", "editing_locked_at"] };
      if (request.method === "GET" && Object.hasOwn(tables, functionName)) {
        const query = new URL(request.url, "http://localhost").searchParams;
        const columns = query.get("select").split(",");
        assert(columns.every(column => tables[functionName].includes(column)));
        const args = []; const filters = [];
        for (const [column, filter] of query) {
          if (["select", "order"].includes(column)) continue;
          assert(tables[functionName].includes(column));
          if (filter === "is.null") filters.push(`${column} is null`);
          else if (filter.startsWith("eq.")) { args.push(filter.slice(3)); filters.push(`${column}=$${args.length}`); }
          else if (filter.startsWith("in.(")) { args.push(filter.slice(4, -1).split(",")); filters.push(`${column}=any($${args.length}::uuid[])`); }
          else throw new Error("Unexpected test filter");
        }
        let order = "";
        if (query.has("order")) { const [column, direction] = query.get("order").split("."); assert(tables[functionName].includes(column)); assert(["asc", "desc"].includes(direction)); order = ` order by ${column} ${direction}`; }
        const data = await db.transaction(async tx => {
          await tx.exec(`set local role ${authenticated ? "authenticated" : "anon"}`);
          await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [authenticated ? ownerId : ""]);
          return (await tx.query(`select ${columns.join(",")} from public.${functionName}${filters.length ? ` where ${filters.join(" and ")}` : ""}${order}`, args)).rows;
        });
        const result = request.headers.accept?.includes("application/vnd.pgrst.object+json") ? data[0] ?? null : data;
        response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
        return;
      }
      assert(["get_public_menu", "resolve_menu_code", "resolve_old_slug", "get_editor_menu", "mutate_menu"].includes(functionName));
      let body = "";
      for await (const chunk of request) body += chunk;
      const args = JSON.parse(body);
      const value = args.p_slug ?? args.p_code;
      const key = `${functionName}:${value}`;
      calls.set(key, (calls.get(key) ?? 0) + 1);
      const data = await db.transaction(async tx => {
        await tx.exec(`set local role ${authenticated ? "authenticated" : "anon"}`);
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [authenticated ? ownerId : ""]);
        const sqlArgs = functionName === "mutate_menu" ? [args.p_restaurant_id, args.p_operation, JSON.stringify(args.p_payload)] : functionName === "get_editor_menu" ? [args.p_restaurant_id] : [value];
        return (await tx.query(`select public.${functionName}(${functionName === "mutate_menu" ? "$1,$2,$3::jsonb" : "$1"}) as value`, sqlArgs)).rows[0].value;
      });
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
    } catch (error) {
      response.writeHead(error.code === "P0002" ? 404 : error.code === "42501" ? 403 : 400, { "Content-Type": "application/json" }).end(JSON.stringify({ message: error.message, code: error.code }));
    }
  });
  mock.listen(0, "127.0.0.1");
  await once(mock, "listening");
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mock.address().port}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "menu-test", NEXT_TELEMETRY_DISABLED: "1" };
  console.log("Building production app against isolated, in-memory PostgreSQL…");
  const build = await runNext(["build"], env);
  const [code] = await once(build, "exit");
  assert.equal(code, 0, output);
  const port = 3148;
  const base = `http://127.0.0.1:${port}`;
  output = "";
  app = await runNext(["start", "--hostname", "127.0.0.1", "--port", String(port)], env);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    assert.equal(app.exitCode, null, output);
    try { if ((await fetch(base + "/api/health")).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(ready, output);

  const live = await page(base, "/live-kitchen");
  assert.equal(live.response.status, 200);
  for (const text of ["Live Kitchen", "Test thali", "Rs 180.05", "Sold out", "Prices include", "13", "tel:+9779801234567"]) assert(live.body.includes(text), text);
  assert(!live.body.includes("ILLUSTRATIVE PRICES"));
  assert(!live.body.includes("Other Kitchen"));
  const queryCount = calls.get("get_public_menu:live-kitchen");
  const historyCount = calls.get("resolve_old_slug:live-kitchen");
  await page(base, "/live-kitchen");
  assert.equal(calls.get("get_public_menu:live-kitchen"), queryCount, "warm menu must reuse its cached projection");
  assert.equal(calls.get("resolve_old_slug:live-kitchen"), historyCount, "warm scans must not query slug history again");
  assert((await page(base, "/other-kitchen")).body.includes("Other Kitchen"));
  console.log("PASS live menu, precise prices, sold-out labels, contact links, warm cache and tenant isolation");

  for (const [slug, secret] of [["private-draft", "Secret Draft Name"], ["paused-kitchen", "Secret Suspended Name"]]) {
    const { body } = await page(base, `/${slug}`);
    assert(body.includes("isn’t available right now"));
    assert(!body.includes(secret));
    assert(!body.includes("Test thali"));
  }
  const missing = await page(base, "/unknown-kitchen");
  assert(missing.response.status === 404 || missing.body.includes('name="robots" content="noindex"'));
  assert(missing.body.includes("Menu not found"));
  console.log("PASS draft/suspended privacy and unknown-menu handling");

  const privateHeaders = { cookie };
  const editorUrl = `${base}/api/dashboard/restaurants/${restaurant.id}/menu`;
  let snapshotResponse = await fetch(editorUrl, { headers: privateHeaders });
  assert.equal(snapshotResponse.status, 200, await snapshotResponse.clone().text());
  assert(snapshotResponse.headers.get("cache-control").includes("private"));
  assert(snapshotResponse.headers.get("cache-control").includes("no-store"));
  let snapshot = await snapshotResponse.json();
  assert.equal(snapshot.restaurant.id, restaurant.id);
  assert.equal((await fetch(`${base}/api/dashboard/restaurants/${otherId}/menu`, { headers: privateHeaders })).status, 404);
  assert.equal((await fetch(editorUrl)).status, 401);
  const workspace = await fetch(`${base}/dashboard/${restaurant.id}`, { headers: privateHeaders });
  const workspaceBody = await workspace.text();
  assert(workspaceBody.includes("Your menu") && workspaceBody.includes("Test thali"), workspaceBody.slice(-1500));
  const preview = await fetch(`${base}/dashboard/${draftId}/preview`, { headers: privateHeaders });
  assert((await preview.text()).includes("Only signed-in restaurant members"));
  assert(preview.headers.get("cache-control").includes("no-store"));
  console.log("PASS authenticated workspace, isolated SWR endpoint, private draft preview and cross-tenant 404");

  const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
  const [actionId] = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === "mutateEditorAction") ?? [];
  assert(actionId, "Editor server action must be registered");
  async function action(tenant, operation, payload) {
    const response = await fetch(`${base}/dashboard/${tenant}`, { method: "POST", headers: { ...privateHeaders, "Next-Action": actionId, Origin: base, "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify([tenant, { operation, payload }]) });
    const text = await response.text();
    assert.equal(response.status, 200, text.slice(-1500));
    return text;
  }

  const qrPath = `/q/${restaurant.short_code}`;
  let qr = await page(base, qrPath);
  assert.equal(qr.response.status, 302);
  assert.equal(new URL(qr.response.headers.get("location"), base).pathname, "/live-kitchen");
  assert(qr.response.headers.get("cache-control").includes("no-store"));
  const { restaurant: settings } = snapshot;
  assert((await action(restaurant.id, "settings", { name: settings.name, slug: "renamed-kitchen", name_ne: settings.name_ne, description: settings.description, phone: settings.phone, address: settings.address, map_url: settings.map_url, theme_color: settings.theme_color, prices_include_vat: settings.prices_include_vat, vat_percent: settings.vat_percent, service_charge_percent: settings.service_charge_percent, opening_hours: settings.opening_hours })).includes("Saved."));
  qr = await page(base, qrPath);
  assert.equal(new URL(qr.response.headers.get("location"), base).pathname, "/renamed-kitchen");
  const old = await page(base, "/live-kitchen?from=old");
  assert.equal(old.response.status, 301);
  assert.equal(new URL(old.response.headers.get("location"), base).pathname, "/renamed-kitchen");
  assert.equal(new URL(old.response.headers.get("location"), base).search, "?from=old");
  assert(old.response.headers.get("cache-control").includes("no-store"));
  assert((await page(base, "/renamed-kitchen")).body.includes("Test thali"));
  const badCode = await page(base, "/q/invalid");
  assert.equal(badCode.response.status, 404);
  assert(badCode.response.headers.get("cache-control").includes("no-store"));
  console.log("PASS immutable QR follows rename, historical URL returns explicit 301, missing QR returns 404");

  outage = true;
  const qrOutage = await page(base, qrPath);
  assert.equal(qrOutage.response.status, 503);
  assert(qrOutage.response.headers.get("cache-control").includes("no-store"));
  const warmOutage = await page(base, "/renamed-kitchen");
  assert.equal(warmOutage.response.status, 200);
  assert(warmOutage.body.includes("Test thali"), "a warm menu must keep serving from cache during a database outage");
  const coldOutage = await page(base, "/never-seen-kitchen");
  assert.equal(coldOutage.response.status, 503);
  assert(coldOutage.response.headers.get("cache-control").includes("no-store"));
  assert((await page(base, "/momo-house")).body.includes("ILLUSTRATIVE PRICES"));
  console.log("PASS outages keep warm menus online, uncached lookups return 503; demo remains usable without the database");
  outage = false;




  const item = snapshot.categories[0].items[0];
  const itemPayload = { id: item.id, category_id: category.id, name: item.name, name_ne: null, description: item.description, description_ne: null, price_minor: 18101, variants: [], is_available: true, diet: null, spice_level: null, confirm_prices: false };
  assert((await action(restaurant.id, "saveItem", itemPayload)).includes("Saved."));
  assert((await page(base, "/renamed-kitchen")).body.includes("Rs 181.01"), "committed price must expire the warm public cache immediately");
  await action(restaurant.id, "saveItem", { ...itemPayload, price_minor: -1 });
  assert((await page(base, "/renamed-kitchen")).body.includes("Rs 181.01"), "failed save must preserve the last committed price");
  assert((await action(otherId, "availability", { id: item.id, available: false })).includes("Restaurant not found"));
  assert((await action(restaurant.id, "visibility", { published: false })).includes("Saved."));
  assert((await page(base, "/renamed-kitchen")).body.includes("isn’t available right now"));
  assert((await action(restaurant.id, "visibility", { published: true })).includes("Saved."));
  const republished = await page(base, "/renamed-kitchen");
  assert(republished.body.includes("Rs 181.01"), JSON.stringify({ status: republished.response.status, body: republished.body.slice(-1800), calls: [...calls.entries()], database: (await db.query("select status from public.restaurants where id=$1", [restaurant.id])).rows }));
  for (let cycle = 0; cycle < 3; cycle++) {
    await action(restaurant.id, "visibility", { published: false });
    assert((await page(base, "/renamed-kitchen")).body.includes("isn’t available right now"));
    await action(restaurant.id, "visibility", { published: true });
    assert((await page(base, "/renamed-kitchen")).body.includes("Rs 181.01"), "repeated publication transitions must remain fresh");
  }
  const receipt = await action(draftId, "saveCategory", { name: "Rice", name_ne: null, is_visible: true });
  assert(receipt.includes("Saved."));
  const draftSnapshot = await (await fetch(`${base}/api/dashboard/restaurants/${draftId}/menu`, { headers: privateHeaders })).json();
  assert((await action(draftId, "saveItem", { ...itemPayload, id: undefined, category_id: draftSnapshot.categories[0].id, name: "Draft rice", price_minor: 20000 })).includes("Saved."));
  assert((await action(draftId, "visibility", { published: true })).includes("Saved."));
  assert((await page(base, "/private-draft")).body.includes("Draft rice"), "publish must invalidate a cached unavailable menu");
  const badUpload = await fetch(`${base}/api/dashboard/restaurants/${restaurant.id}/images?kind=logo`, { method: "POST", headers: { ...privateHeaders, Origin: "https://untrusted.example" } });
  assert.equal(badUpload.status, 403);
  assert.equal((await fetch(`${base}/api/dashboard/restaurants/${otherId}/images?kind=logo`, { method: "POST", headers: { ...privateHeaders, Origin: base } })).status, 404);
  const invalidImage = new FormData();
  invalidImage.set("image", new Blob(["not an image"], { type: "image/png" }), "fake.png");
  const rejectedImage = await fetch(`${base}/api/dashboard/restaurants/${restaurant.id}/images?kind=logo`, { method: "POST", headers: { ...privateHeaders, Origin: base }, body: invalidImage });
  assert.equal(rejectedImage.status, 400);
  assert(rejectedImage.headers.get("cache-control").includes("no-store"));
  console.log("PASS real Server Actions invalidate prices/publication caches after commit; failed and cross-tenant saves are rejected; upload rejects foreign origins");
  if (process.argv.includes("--browser")) {
    const { checkEditorBrowser } = await import("./check-editor-browser.mjs");
    await checkEditorBrowser({ base, cookie, restaurantId: restaurant.id, draftId });
  }

  const scripts = [...live.body.matchAll(/<script\b([^>]*\bsrc="([^"]+)"[^>]*)>/g)]
    .filter(match => !/\bnomodule\b/i.test(match[1])).map(match => match[2]);
  let compressedBytes = 0;
  for (const path of new Set(scripts)) compressedBytes += gzipSync(Buffer.from(await (await fetch(base + path)).arrayBuffer())).length;
  console.log(`Public route initial JavaScript: ${(compressedBytes / 1024).toFixed(1)} KiB gzip (modern browser; includes framework runtime, excludes nomodule polyfills).`);
} catch (error) {
  console.error(error);
  if (output) console.error(output);
  process.exitCode = 1;
} finally {
  if (app && app.exitCode === null) { app.kill(); await once(app, "exit"); }
  if (mock) { mock.closeAllConnections(); await new Promise(resolve => mock.close(resolve)); }
  await db.close();
}
