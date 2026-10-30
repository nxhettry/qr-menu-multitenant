# Phase 4 — VAT pricing, dish catalog, shared images, RestroFuel Connect

Drafted 29 October 2026. Cross-cutting cache profile and 4A are implemented (see "Implementation status"); 4B–4D are not started. All decisions are recorded at the end.

## Implementation status

### Cross-cutting: `menu` cache profile — done

`menu` profile (stale 300, revalidate 86400, expire 604800) in `next.config.ts`; `getPublicMenu` uses `cacheLife("menu")`; [CACHING.md](CACHING.md) updated. The RestroFuel sync route (4D) is not built yet.

### 4A — Restaurant-level VAT — done, migration not yet applied

- **Migration** `supabase/migrations/202610290002_vat_mode_conversion.sql` (**ready to apply, not applied to any Supabase project**): `private.convert_vat_price`, `private.convert_addon_groups`, `private.convert_menu_vat_mode` (runs inside `private.lock_menu`, OWNER/MANAGER only, one transaction, audit event `menu.changeVatMode`) and the exposed wrapper `public.change_vat_mode(restaurant, include_vat, convert)`. A conversion that would push any price over Rs 1,00,00,000 fails and rolls back. Switching to the current mode is a no-op. Soft-deleted items are left alone.
- **Shared math** `src/lib/menu/vat.ts` (`convertVatPrice`, `guestPrice`, integer half-up rounding identical to SQL); `guestPrice` is re-exported from `presentation.ts` and used by item cards, variants, add-ons and the specials banner. The footer always reads "Prices include N% VAT."
- **Owner side:** `VatFields` in settings (VAT on/off, rate, "Prices I enter are" including/excluding; changing mode is disabled while the rate is unsaved), `VatModeDialog` with the two choices and a preview (`src/lib/editor/vat-conversion.ts`, computed client-side from the editor snapshot), `changeVatModeAction` + `useMenuEditor().changeVatMode`, `invalidateMenu` after commit. The editor list shows "Guests pay Rs X" and the item form shows a guest-price hint under the price and each variant price in exclusive mode. The settings save always sends the saved mode, so it can never revert a conversion.
- **Tests:** `scripts/test-editor.mjs` (conversion of items, variants and add-ons; both strategies; permissions incl. EDITOR/anonymous/other tenant; no-op; audit; overflow rollback; tenant isolation; SQL ≡ TypeScript rounding), `scripts/test-public-menu.mjs` (guest price in both modes, round-trip), `scripts/check-public-menu.mjs` (real Server Action → cache invalidation → guest HTML).
- **Not done / notes:** add-on price inputs in the item form have no guest-price hint; RestroFuel lock (item 4 of 4A) belongs to 4D. **Deploy impact:** restaurants already saved as "excluding VAT" with a VAT rate above 0 will immediately show prices 13% higher (rounded) to guests; review those before applying the migration or switch them to "Keep my numbers" once applied.

## Goals

1. Guests see the price they pay. Owners choose whether they type prices with or without VAT and can convert the whole menu when they switch.
2. Item names are consistent across restaurants: owners pick from a shared dish catalog while typing, so typos and near-duplicate names stop multiplying.
3. Dish photos are shared. Owners pick from curated, high-quality images; uploads are the exception, limited, deduplicated, and shared only with consent.
4. Restaurants running RestroFuel connect once from **Settings → Integrations**. Their RestroFuel menu is imported and every later change (items, prices, availability, categories, add-ons) appears here within seconds, without guests ever reaching the restaurant's server.

Build order: 4A → 4B → 4C → 4D. 4C depends on 4B (images hang off dishes); 4D depends on 4A (VAT rules) and benefits from 4B (synced items are matched to dishes for photos).

## Cross-cutting changes

- **Public menu cache.** Every write path already invalidates `menu:<id>` and slug tags, so time-based expiry is only a fallback for edits made outside the app. Replace `cacheLife({ stale: 30, revalidate: 60, expire: 300 })` in `src/lib/menu/repository.ts` with a named `menu` profile (stale 5 min, revalidate 1 day, expire 1 week) defined in `next.config.ts`, and update [CACHING.md](CACHING.md). The RestroFuel sync route invalidates the same tags with `revalidateTag(tag, { expire: 0 })`.
- **No live refresh of open guest screens.** Guests see changes on their next load.
- **Patterns stay as they are:** SQL migrations with RLS and transactional RPCs, repositories under `src/lib/**`, Zod schemas shared by client and server, SWR hooks in `src/hooks` for owner data, Server Actions + `invalidateMenu` for owner writes, route handlers with `revalidateTag(..., { expire: 0 })` for machine writes, tests in `scripts/test-*.mjs` against isolated PostgreSQL.

## 4A — Restaurant-level VAT

**Already present:** `restaurants.prices_include_vat`, `vat_percent` and `service_charge_percent`, edited in `settings-form.tsx`. Today the public menu only prints a note ("Prices exclude 13% VAT") and never adjusts the number.

Changes:

1. **Settings UI.** Replace the bare checkbox with: *VAT* on/off (on sets `vat_percent` to 13, editable), and *Prices I enter are* **including VAT** / **excluding VAT**.
2. **Guest display.** `src/lib/menu/presentation.ts` gets one pure `guestPrice(priceMinor, menu)` used by item cards, variants and add-ons: exclusive mode shows `round(price × (1 + vat))` to the nearest rupee; inclusive mode shows the stored price. The footer note becomes "Prices include 13% VAT". The owner editor keeps showing the entered price, with the guest price beside it in exclusive mode.
3. **Switching mode.** Changing the mode opens a dialog with two choices:
   - *Keep what guests pay* — convert every stored item, variant and add-on price (÷ or × 1.13, rounded to whole rupees) so the guest price stays the same.
   - *Keep my numbers* — only the meaning changes; guest prices move by 13%.
   The dialog previews the first rows ("Chicken Momo Rs 250 → Rs 283") and the count of changed prices. Conversion runs in one RPC (`private.convert_menu_vat_mode`) inside the existing restaurant lock, writes an audit event, then invalidates the menu.
4. **RestroFuel-connected restaurants** (4D): mode is locked to *including VAT* and the VAT controls are read-only, because RestroFuel's `rate` is already the final price.

Tests: conversion round trip, rounding, variants and add-on groups, permissions (OWNER/MANAGER only), invalidation after conversion, guest price rendering in both modes.

## 4B — Dish catalog and name suggestions

A shared, admin-managed list of canonical dishes that both name suggestions and the image library use.

**Schema (migration `2026110xxxxx_dish_catalog.sql`):**

| Table | Purpose |
| --- | --- |
| `public.dishes` | `id`, `name`, `name_ne`, `aliases text[]`, `normalized` (generated), `tags text[]`, `status` (ACTIVE/HIDDEN), timestamps. Readable by everyone; writable by super-admins only. |
| `private.dish_name_candidates` | Names typed by owners that matched no dish: `normalized`, sample spelling, restaurant count, last seen. Feeds the admin review list. |
| `menu_items.dish_id` | Nullable FK. Set when the owner accepts a suggestion; kept on rename only if the new name still matches. |

A SQL `private.normalize_dish_name(text)` lowercases, strips punctuation/colons (`mo:mo` → `momo`), collapses spaces and removes common qualifiers kept separately (`(steam)`, `half`, `full`). `pg_trgm` index on `normalized` for server-side matching (imports, sync, admin).

**Suggestions while typing (no database call per keystroke):**

- `GET /api/dishes` returns the whole active catalog (id, name, name_ne, aliases, has-image flag) — a few hundred rows, tens of KB. Served from a `use cache` repository tagged `dishes` with a long lifetime; admin edits invalidate it.
- `useDishCatalog()` (SWR, long `dedupingInterval`, no focus revalidation) loads it once per session. `useDishSuggestions(query)` debounces input (~150 ms via `use-debounced-value`), builds a memoized search index once, and returns the top matches (prefix, alias and trigram-style fuzzy match in the browser).
- The item name field becomes an accessible combobox: suggestions appear under the input; Enter or tap picks one and sets `dish_id`. Mobile-first: full-width list, 44 px rows.
- On save, a name that is a near miss of a dish (high similarity, not exact) shows "Did you mean *Chicken Momo*?" with **Use suggestion** / **Keep my name**. Owners are never forced; unmatched names are recorded as candidates.
- Bulk import (`use-menu-import` / `bulk-import.tsx`) shows the matched dish beside each row with the same accept/keep choice.

**Admin portal:** a Dishes page to add, edit, hide, merge (moving aliases and item links), and promote candidates into dishes or into aliases of an existing dish.

Seed: an initial catalog of common Nepali and restaurant dishes (momo, chowmein, thukpa, thakali set, sekuwa, chatamari, lassi, tea/coffee variants, etc.), with Nepali names and aliases, shipped as a migration seed.

## 4C — Shared image library

**Schema (migration `2026110xxxxx_media_library.sql`):**

| Table / column | Purpose |
| --- | --- |
| `public.media_assets` | `id`, `public_id`, `version`, `width`, `height`, `sha256` (unique), `source` (CURATED/USER), `owner_restaurant_id` (null for curated), `visibility` (PRIVATE/PENDING/PUBLIC/REJECTED), `dish_id`, timestamps. |
| `menu_items.image_asset_id` | Replaces `image_public_id` + `image_version`. Existing images are moved into `media_assets` as PRIVATE USER assets of their restaurant, and the old columns are dropped after the public RPC reads the new one. |

Rules:

- **Picker first.** The item form's image area opens a picker showing PUBLIC assets for the item's `dish_id` (then by name match), plus the restaurant's own private uploads. Choosing one only stores the reference: no upload, no new storage.
- **Uploads.** The existing upload route keeps its Sharp validation and resizing. Before uploading to Cloudinary it hashes the processed bytes; an existing asset with the same hash is reused. New uploads are PRIVATE to the restaurant. A "Let other restaurants use this photo" checkbox (off by default, explained in the terms) moves it to PENDING for super-admin approval.
- **Quota.** The current database quota (20 attempts per restaurant per rolling 24 hours, `private.menu_uploads`) becomes 15 per rolling 24 hours, 50 during the first 7 days after the restaurant is created, with a per-restaurant super-admin override (D4). Picking a library image never counts.
- **Deletion.** Shared and curated assets are never deleted because an item or restaurant was removed. Private assets with no references are cleaned up later by an admin job, never immediately (cached pages may still use them).
- **Admin portal.** Curated upload (attached to a dish), pending-approval queue, reject/hide.
- **Cloudinary.** One account (the QR app's). Folders: `library/<dishId>/…` for curated and approved assets, existing tenant folders for private uploads. Versioned delivery URLs keep long-lived CDN caching.

## 4D — RestroFuel Connect

### How data flows

RestroFuel pushes; the QR app stores and serves. Guests never contact the restaurant's server, so a closed restaurant PC, an internet outage or a changed tunnel URL never breaks a menu.

```
RestroFuel server (on-prem)                      QR Menu (Vercel + Supabase)
menu write ─► Prisma extension marks dirty
          ─► debounce ~3 s ─► build snapshot + hash
          ─► POST /api/integrations/restrofuel/sync ─► verify HMAC, apply snapshot (one RPC)
                                                     ─► revalidateTag(menu:<id>, { expire: 0 })
offline: retry with backoff; reconcile on startup, on reconnect and every 15 min (skipped when the hash is unchanged)
```

### Pairing

1. QR app, **Settings → Integrations → RestroFuel**: owner taps **Connect**, sees a 6–8 character code valid for 10 minutes and the steps to follow.
2. RestroFuel app (`restrofuel` and `restrofuel_lite`, Settings → Integrations → QR Menu): admin enters the code.
3. RestroFuel server calls `POST /api/integrations/restrofuel/pair` with the code and its install id. The QR app returns a per-restaurant signing secret, stored only as a hash on the QR side and in RestroFuel's settings on the restaurant side.
4. RestroFuel immediately sends a full snapshot. The QR app shows a first-import preview (decision D6) and, once confirmed, the integration is **Active**.

States: Active, Paused (owner-disabled: sync rejected, items editable), Disconnected (secret revoked; items stay as normal editable items with their `external_id` cleared).

### QR Menu side

- **Migration `2026110xxxxx_restrofuel_integration.sql`:** `private.restaurant_integrations` (restaurant, provider, status, secret hash, install id, pairing code hash + expiry, last snapshot hash, last synced at, last error, timestamps); nullable `external_id` on `menu_categories`, `menu_items`, `menu_item_variants` with unique `(restaurant_id, external_id)`; RPCs `private.start_pairing`, `private.complete_pairing`, `private.apply_restrofuel_snapshot`, `private.set_integration_status`.
- **Routes:** `pair` and `sync` under `src/app/api/integrations/restrofuel/`. `sync` checks the signature (`HMAC-SHA256(secret, timestamp + body)`, 5-minute window), rejects bodies over a size limit, returns `200 unchanged` when the hash matches, and applies the snapshot in one transaction: upsert by `external_id`, soft-delete what disappeared, keep QR-owned fields.
- **Field ownership while connected.** RestroFuel owns item name, description, price, availability, category, item set and add-ons. QR Menu keeps Nepali name/description, photo, diet detail, spice, sort order and featured flag. Owned fields are read-only in the editor with a "Managed by RestroFuel" badge.
- **Mapping:**

  | RestroFuel | QR Menu |
  | --- | --- |
  | `MenuCategory` (active, not deleted, not system) | `menu_categories` by `external_id`; inactive → hidden |
  | `MenuItem` (not deleted, not add-on-only, event package or room charge) | `menu_items` by `external_id` |
  | `rate` | `price_minor = round(rate × 100)`; shown as is (VAT locked to inclusive) |
  | `isAvailable` | `is_available` |
  | `isVeg` true | `diet = VEG`; false leaves the owner's diet value unchanged |
  | `MenuItemAddon` + `maxAddons` | one "Add-ons" group in item details, `max_select = maxAddons` |
  | `imageUrl` | ignored |

  New synced items are matched to the dish catalog by name to suggest photos; names themselves are never changed.
- **UI:** an Integrations section in settings (status, last synced, last error, Pause/Resume, Disconnect) via a `useIntegrationStatus` SWR hook.

### RestroFuel side (`RestroFuelVat/server` + Flutter apps)

- New module `server/src/integrations/qr-menu/`: settings storage, pairing call, snapshot builder (reusing the query behind `menuServices.getPublicMenu()` without heat or images), sender with backoff, reconcile timer, status endpoint for the app.
- A Prisma extension, alongside the existing audit extension in `server/prisma/client.ts`, marks the menu dirty after successful writes to `MenuItem`, `MenuCategory`, `MenuItemAddon` and `Restaurant`. Covers every service path (single/bulk edits, replace-menu, add-ons) without touching each one. Raw SQL writes, if any are added later, must call the same `markMenuDirty()`.
- Not run in `MOBILE_CLOUD` mode in this phase.
- Flutter: an Integrations → QR Menu screen in both apps (enter code, status, last sync, disconnect).

## Verification

- Unit/integration tests for every RPC (tenant isolation, permissions, idempotent snapshots, deletions, field ownership, disconnect) in the existing `scripts/test-*.mjs` suites.
- Signed-request tests: bad signature, stale timestamp, replay, oversized body, paused integration.
- RestroFuel side: Vitest for the extension, debounce, backoff and reconcile; an end-to-end run against a local QR app.
- Browser checks at 390 px for the VAT dialog, name combobox, image picker and integrations screen (`interactive-browser-verification` skill).
- Cache: price and availability changes pushed from RestroFuel appear on the next public request.

## Decisions

Confirmed 29 October 2026.

| # | Decision | Answer |
| --- | --- | --- |
| D1 | What guests see in VAT-exclusive mode | Final price: entered price + VAT, rounded to whole rupees, with "Prices include 13% VAT" |
| D2 | Source of curated images | Provided by the owner while 4A–4B are built; 4C ships the library and admin upload, seeding waits for the images |
| D3 | Sharing user uploads | Opt-in by the owner, then super-admin approval |
| D4 | Upload limit per restaurant per rolling 24 h | 15; 50 during a restaurant's first 7 days; super-admin override |
| D5 | Custom names that match no dish | Allowed after a "Did you mean…?" prompt; recorded as candidates |
| D6 | Existing QR-only menu on first connect | Preview, link matching items by name (keeping photos and Nepali names), hide unmatched items without deleting them |
