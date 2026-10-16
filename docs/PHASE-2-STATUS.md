# Phase 2 — public menus and permanent links

## Implemented

- `/{slug}` reads `get_public_menu` through a cookie-free publishable-key Supabase client and validates the returned projection. Private fields are not rendered or cached. The reserved `/momo-house` remains a clearly labelled standalone demo.
- Published menus show English/Nepali text, categories, single/variant NPR prices, item and variant availability, diet/spice labels, contact/map links, opening hours, configurable tax notes, and a Kathmandu-time updated date.
- Versioned Cloudinary logo/cover/item images use bounded transformations, responsive source selection, fixed dimensions, and native lazy loading. Vercel does not optimize them a second time. The theme accent is darkened where necessary to meet 4.5:1 text contrast against the menu background.
- Draft and suspended restaurants reveal only a generic unavailable state. Missing or deleted addresses show a menu-not-found view. Database errors do not become false 404 results.
- `/q/{shortCode}` resolves live to the current slug with 302 and `no-store`. Historical addresses use an uncached proxy lookup and explicit 301, preserving query parameters. Both paths return uncached 503 responses on lookup failure.
- Full menu projections use `use cache`, per-slug/per-restaurant tags, and the documented 30/60/300-second cache policy. The small historical-address lookup remains uncached on each public request. Auth and SWR do not run on public menus.
- Dashboard restaurant cards link to their public address. Draft addresses intentionally remain unavailable to guests until publishing is implemented.

## Verification

`npm test`: **17 tests passed**, covering the SQL projection and RLS, hidden/deleted items, draft/suspended/deleted restaurants, changed prices, safe links, Cloudinary identifiers, currency precision, response validation, and accent contrast.

Lint, TypeScript, the normal production build, and all existing HTTP auth/dashboard/demo regression checks passed. The local site-origin setting was corrected to `http://localhost:3000`; the deployed Vercel setting must remain `https://restrofuel-qrmenu.vercel.app`.

`npm run check:public-menu`: **passed**. This builds and starts the production app against a local HTTP adapter backed by the actual foundation SQL in an isolated in-memory PostgreSQL database. It checks live rendering, public-only credentials, tenant separation, warm projection-cache reuse, unavailable/missing states, QR resolution after rename, explicit historical 301 responses, and uncached outage responses.

The measured initial external JavaScript is **141.4 KiB gzip** for a modern browser, including the framework runtime and excluding `nomodule` polyfills (180.1 KiB including those legacy polyfills). This exceeds the proposed 100 KB budget. The two largest chunks are the shared Next.js/React runtime; removing public SWR alone cannot meet that target. Browser transfer/paint measurements and further framework/bundle work remain open, rather than treating the performance gate as passed.

This command builds `.next` with local test credentials. Run `npm run build` afterward before manually starting the app against your real configuration. It never changes the cloud database or sends emails.

## Remaining gates

- Verify the deployed Vercel build, actual low-end Android/slow-4G LCP, and public JavaScript against the plan's 100 KB target. Local HTTP tests do not measure browser paint timing or CDN behavior.
- Phase 3 adds owner category/item/variant editing, settings, image uploads, and atomic publishing. Those mutation paths must invalidate menu and old/new slug tags only after successful commit, then revalidate the authenticated SWR resource. Creation already invalidates its slug tag.
- Direct Supabase SQL/dashboard edits rely on fallback cache lifetimes until an authenticated invalidation integration exists. An already open customer menu updates on reload/navigation.
- No new cloud migration is required for this phase; it consumes the existing foundation RPCs. No customer menus or publication statuses were changed during development.
