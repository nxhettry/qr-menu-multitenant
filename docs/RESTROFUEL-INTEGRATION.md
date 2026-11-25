# RestroFuel ↔ QR menu integration

RestroFuel POS customers connect their QR menu to the restaurant server instead of building the menu by hand. Free users keep the manual editor and bulk import.

The QR menu never reads the restaurant server while guests browse. It reads the server only to **connect**, to **sync**, and for future events added to the same channel. The public menu is always served from Supabase, so it stays up when the restaurant PC is off.

Scope of v1: RestroFuelVat (non-VAT restaurants) only. RestroFuelVat-IRD gets the same code through the usual sync later, with `pricesIncludeVat: true`. Mobile-cloud shops (`MOBILE_CLOUD=true`) have no tunnel and are excluded.

## Decisions

| Topic | Decision |
| --- | --- |
| Transport | The restaurant server is reachable over its cloudflared tunnel (`https://<slug>.kree.com.np`, recorded in `C:\ProgramData\RestroFuel\tunnel-info.json`). The QR app pulls from it; the server only sends a small "sync requested" call to the QR app. |
| Proof of customer | Every response from the server carries its Fleet-signed license (Ed25519, `k1`). The QR app verifies the signature and that `payload.slug` matches the tunnel host. A server Fleet has not licensed cannot connect. |
| License expiry | The QR menu keeps working as a normal account. Sync is disabled while the license state is not `pilot`/`active`/`expiring`/`extended`, or it is suspended. |
| Connect entry points | "Connect QR menu" in the Flutter POS (settings) and in the admin web app (restrofuel-accounting). Both open the QR site in a browser. |
| Sync trigger | "Sync now" in the admin web app. |
| Applying a sync | Staged. The QR dashboard shows a badge and a change list; the owner reviews, adjusts and applies. Guests see nothing until it is applied. |
| Conflicts | A field is overwritten only if its RestroFuel value changed since the last applied sync (three-way). Items removed in RestroFuel are hidden, not deleted. Items created in the QR app are never touched. |
| Existing QR restaurant | The connect page offers "create a new restaurant" or "link an existing one"; linking an existing one offers "replace current menu" or "add alongside". |
| Mapping | One RestroFuel item = one QR item (no variants). Add-ons become one "Add-ons" group owned by the sync. No images (RestroFuel image URLs are not usable). |
| Notification | Dashboard only (badge + banner). |
| `/api/qr/menu` | The unused anonymous endpoint becomes server-to-server only, behind the link secret. Its browser CORS entry is removed. |

## Flow

```text
POS / admin web            Restaurant server (tunnel)                 QR app
──────────────             ──────────────────────────                 ──────
Connect QR menu ──► POST /api/qr-menu/connect
                    ← connectUrl (one-time code, 10 min)
open browser ───────────────────────────────────────────────────────► /connect/restrofuel?server=…&code=…
                                                                       owner signs in, picks new/existing
                    POST /api/qr/menu/link {code} ◄─────────────────── redeem code
                    → {linkId, secret, license}
                    GET  /api/qr/menu (Bearer) ◄────────────────────── pull snapshot
                                                                       preview → confirm → publish

Sync now ─────────► POST /api/qr-menu/sync
                    POST {QR}/api/integrations/restrofuel/sync ──────► verify HMAC
                                                                       GET /api/qr/menu, diff, stage, badge
```

## Server ↔ QR contract

### Server, public over the tunnel (`/api/qr/menu`)

- `POST /api/qr/menu/link` — body `{ code, qrRestaurantId }`. Redeems an unexpired, unused pairing code once. Replaces any previous link. Returns `{ linkId, secret, license }`.
- `GET /api/qr/menu` — header `Authorization: Bearer <secret>`. Returns `{ snapshot, license }`.
- `DELETE /api/qr/menu/link` — header `Authorization: Bearer <secret>`. The QR side disconnected.

### Server, authenticated admin (`/api/qr-menu`)

- `POST /connect` → `{ connectUrl, expiresAt }`. 409 when there is no tunnel or no license.
- `GET /status` → `{ linked, qrRestaurantId, linkedAt, lastSyncRequestedAt }`.
- `POST /sync` → calls the QR app; returns its result.
- `DELETE /link` → removes the link and tells the QR app.

### QR app

- `POST /api/integrations/restrofuel/sync` and `POST /api/integrations/restrofuel/disconnect` — headers `X-RestroFuel-Link`, `X-RestroFuel-Timestamp`, `X-RestroFuel-Signature` = hex HMAC-SHA256(secret, `timestamp + "." + body`). Timestamps older than 5 minutes are rejected.

### Snapshot (`v: 1`)

```json
{
  "v": 1,
  "edition": "vat",
  "pricesIncludeVat": false,
  "restaurant": { "name": "…", "address": "…", "phone": "…" },
  "categories": [{ "ref": "12", "name": "Momo", "description": null, "sortOrder": 0 }],
  "items": [{
    "ref": "301", "categoryRef": "12", "name": "Chicken Momo", "description": null,
    "price": 250, "isVeg": false, "isAvailable": true,
    "addons": [{ "name": "Extra achar", "price": 30 }]
  }]
}
```

Leaves out deleted, inactive and system categories; deleted, add-on-only, event-package and room-charge items. Prices are rupees; the QR app converts them to paisa.

## Storage (QR app)

Migration `supabase/migrations/202611250001_restrofuel_link.sql`:

- `private.restrofuel_links`: one row per QR restaurant: server URL, tenant slug, the link secret encrypted with `RESTROFUEL_LINK_KEY` (AES-256-GCM), last license state, `ACTIVE`/`DISCONNECTED`. One active link per tenant slug.
- `private.restrofuel_snapshots`: pulled snapshots with their change summary; at most one `PENDING` per restaurant.
- `menu_categories` and `menu_items` gain `external_ref` (the RestroFuel id) and `external_base` (the RestroFuel values as last applied).

| Function | Caller | Purpose |
| --- | --- | --- |
| `save_restrofuel_link` | Owner/manager | Store the link after the code is redeemed |
| `get_restrofuel_sync` | Member | Link status and the pending update (never the secret) |
| `get_restrofuel_menu_state` | Member or service | Synced refs and bases, deleted rows included |
| `apply_restrofuel_sync` | Owner/manager | Apply a plan in one transaction; every change goes through `mutate_menu` |
| `dismiss_restrofuel_sync`, `disconnect_restrofuel` | Owner/manager | Drop the pending update; end the link |
| `get_restrofuel_link`, `stage_restrofuel_snapshot`, `end_restrofuel_link` | Service only | The signed server-to-app calls |

## Code (QR app)

| Path | Role |
| --- | --- |
| `src/lib/restrofuel/plan.ts` | `summarize` (what changed) and `planSync` (the three-way merge), pure |
| `src/lib/restrofuel/snapshot.ts` | Snapshot schema; RestroFuel item → QR fields (paisa, veg label, "Add-ons" group) |
| `src/lib/restrofuel/license.ts` | Fleet license verification (same Ed25519 keys as the server) |
| `src/lib/restrofuel/server-url.ts`, `connect-link.ts` | Accept only `https://<tenant>.kree.com.np` and well-formed connect links |
| `src/lib/restrofuel/crypto.ts` | Secret encryption and request signatures |
| `src/lib/restrofuel/client.ts`, `service.ts` | Calls to the server; connect, stage, apply, dismiss, disconnect |
| `src/app/connect/restrofuel` | Connect page: sign in or register (the link survives), pick or create a restaurant |
| `src/app/dashboard/[restaurantId]/restrofuel` | Review page: changes, replace/alongside on the first apply, publish, disconnect |
| `src/app/api/integrations/restrofuel/[event]` | `sync` and `disconnect` from the server |
| `src/components/restrofuel/sync-banner.tsx` | Dashboard badge, refreshed every minute while open |

Merge rules: a category or item is matched by ref; an unlinked one with the same name (top-level category, or item in the same category) is adopted on the first sync, keeping its photo and Nepali text. Variant items keep their variant prices. The sync owns only the add-on group named "Add-ons".

## Deploying

1. Apply the migration once to the Supabase project.
2. Set `RESTROFUEL_LINK_KEY` (`openssl rand -base64 32`) on Vercel. `SUPABASE_SECRET_KEY` is already required. Changing the key later breaks existing links; owners would reconnect.
3. Deploy. Supabase redirect URLs already allow `/auth/callback`; registration from a connect link adds a `next` query to it.
4. On restaurant servers, ship the RestroFuelVat release with `src/qr-menu`. Its updater adds `QR_MENU_URL`.

## Tests

`scripts/test-restrofuel.mjs` (in `npm test`): server URL and connect-link validation, license checks with a test key, encryption and signatures, and the full flow on PGlite with every migration: permissions, first sync with name matching and publishing, three-way re-sync, hide/restore, owner deletions, dismiss, replace and disconnect.
