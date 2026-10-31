# QR Menu SaaS — phased build plan

Prepared 16 October 2026 from **QR Menu SaaS for Nepali Restaurants — Revised Build Plan**, dated 15 October 2026 (11 pages), adapted to the stack requested in chat.

Progress: Phase 0 is complete. The Phase 1 foundation migration is applied to Supabase; the owner reports deployed login and restaurant creation working. Phase 2 public menus are connected to Supabase, and Phase 3 owner editing, images, preview, and publishing are implemented. Both database migrations are applied. See [Phase 1 status](PHASE-1-STATUS.md), [Phase 2 status](PHASE-2-STATUS.md), and [Phase 3 status](PHASE-3-STATUS.md) for verification and remaining gates. [Phase 4 plan](PHASE-4-PLAN.md) covers VAT pricing, the dish catalog, shared images and RestroFuel Connect.

## Decisions and scope

The PDF is product reference material. Its package-install instructions are not separate authorization to create accounts or deploy services. The user's requested stack takes precedence over its infrastructure choices.

| Layer | This project | Change from PDF |
| --- | --- | --- |
| Application | Next.js App Router + TypeScript | Keep built-in filesystem routing; no React Router or Express |
| Styling | Tailwind CSS 4 | Add accessible UI primitives when needed |
| Database | Supabase Postgres + versioned SQL migrations | Replaces Neon/Prisma; no second ORM initially |
| Authentication | Supabase Auth + `@supabase/ssr` | Replaces Better Auth; email/password first, Google next |
| Authorization | Server tenant context + Postgres RLS | RLS is mandatory from the start |
| Images | Cloudinary | Replaces R2/sharp workflow; store public IDs and versions |
| Hosting | Vercel | Next.js deployment; use a plan suitable for commercial use |
| Server caching | Next.js Cache Components, `use cache`, `cacheTag`, `cacheLife` | Explicit per-restaurant invalidation |
| Client fetching | SWR stable | Client Components only; scoped private cache and mutation revalidation |
| Input/forms | Zod + React Hook Form | Shared validation; all server inputs checked again |
| QR | `qrcode` + print CSS | Immutable short URL, PNG/SVG, browser Print to PDF |

**Product goal:** an owner publishes a usable menu in under five minutes. Phone-first editing, fast text-first public menus, permanent printed QR codes, and tenant isolation come before feature count.

MVP includes categories, items, variants, branding, onboarding, templates, paste/CSV imports, printing, a super-admin panel, manual subscription tracking, and reliability work. Exclude ordering, food payments, POS, delivery, loyalty, and reservations. AI menu imports, Nepali UI toggle, analytics, staff management UI, custom domains, scheduled menus, and automated subscription gateways follow the pilot.

## Phase 0 — local foundation (this setup)

Deliverables:

- Install current stable Next.js, React, TypeScript, Tailwind, Supabase SDK/SSR, Cloudinary, SWR, Zod, React Hook Form, and QR generation dependencies.
- Use one application in this folder. App Router handles pages and HTTP endpoints.
- Include validated environment helpers, browser/server Supabase client factories, a server-only Cloudinary factory, an SWR boundary, and a cached demo menu with variants.
- Provide `.env.example`, setup instructions, caching policy, and this phased plan.
- Validate TypeScript, lint, and the production build. Demonstration content is not connected to a restaurant database.

Exit: the project builds without cloud credentials; `/momo-house` and `/q/7Kx2pQa` demonstrate the menu and permanent QR URL. `/setup` demonstrates SWR with an uncached health endpoint. Account creation, live authentication, database schema, uploads, and deployment remain later tasks.

## Phase 1 — Supabase schema, auth, and tenant isolation (5–7 working days)

1. Create separate development and production Supabase projects. Configure local `.env.local` and separate Vercel preview/production environment values. Never point preview deployments at production customer data.
2. Add SQL migrations under `supabase/migrations`; generate database TypeScript types. Use Supabase Auth's `auth.users` plus a profile table rather than duplicating sessions/accounts.
3. Implement email/password signup, verification, login, logout, reset password, and validated callback redirects. Configure SMTP and redirect allowlists; enable Google when its OAuth credentials are available.
4. Add the current Next.js `proxy.ts` Supabase session refresh pattern. Session cookies and every auth response must stay uncached. Verify identity server-side with `getClaims()` or `getUser()`, not an unverified `getSession()` value.
5. Build `getTenantContext()` and a central permissions module. A restaurant selector is untrusted input: verify its membership server-side. Never trust a client-supplied restaurant ID or role as authorization.
6. Create restaurant + owner membership + trial subscription in one database transaction through a narrowly granted RPC. RLS and RPC logic prevent clients assigning admin status, adding themselves to arbitrary restaurants, or changing billing state.
7. Enable RLS on every exposed table; explicitly scope server queries by tenant too. Carefully design non-recursive membership policies and any `SECURITY DEFINER` helper with fixed `search_path` and minimum grants.

Data model:

| Table | Required data and constraints |
| --- | --- |
| profiles | Auth user FK; name; admin status kept in a protected server-controlled table/claim, never editable user metadata |
| restaurants | Name/name_ne, unique slug, immutable unique 7-character short_code, branding IDs/versions, theme, phone/address/map/opening hours, NPR, tax display configuration, DRAFT/PUBLISHED/SUSPENDED, published_at, deleted_at, timestamps |
| memberships | user_id, restaurant_id, OWNER/MANAGER/EDITOR; unique pair |
| slug_history | Globally reserved old_slug, restaurant_id; prevent reuse by another restaurant |
| menu_categories | restaurant_id, name/name_ne, sort_order, visibility, deleted_at |
| menu_items | restaurant_id/category_id, English/Nepali fields, integer price_minor or variants, image public ID/version, availability, diet, optional spice 0–3, is_example_price, sort_order, deleted_at, timestamps |
| menu_item_variants | restaurant_id/item_id, name/name_ne, integer price_minor, availability, sort_order |
| subscriptions | restaurant_id, plan, TRIAL/ACTIVE/PAST_DUE/CANCELLED, trial_ends_at, current_period_end, grace deadlines, payment reference, private notes |
| menu_imports | restaurant_id, source_type, status, validation summary, timestamps |
| audit_events | restaurant_id where applicable, trusted actor ID, action, timestamp, minimal metadata |

Use composite FKs `(category_id, restaurant_id)` and `(item_id, restaurant_id)` so children cannot point at another tenant's parent. Enforce nonnegative integer paisa prices and the single-price/variant invariant transactionally. Scope ordering indexes by restaurant; include parent ID where useful. Keep billing and membership data out of anonymous menu queries.

Provide a safe, explicit public projection/RPC exposing only published, non-deleted menu fields. Anonymous access must not expose draft data, auth users, internal notes, memberships, or billing. Public reads use a cookie-free publishable-key client and database policy checks; normal requests do not use a service-role key.

Exit: a verified owner creates a restaurant; automated anonymous/owner/other-tenant tests cover every protected operation and privilege escalation. No UI feature work depends on an untested authorization layer.

## Phase 2 — public menu, permanent links, and cache correctness (4–5 days)

- Replace the fixture with the safe public Supabase projection, keeping database access behind a repository function.
- Build `/{slug}` with phone-first categories, variant price lists, availability, contact/map buttons, tax notes, updated date, accessible theme contrast, English/Nepali data, and fixed-size lazy images. Validate map/contact URLs.
- `/q/{shortCode}` resolves the immutable code to the current slug with an explicit **302** and `Cache-Control: no-store`. Printed QR codes never contain the editable slug.
- Resolve old slugs with an explicit **301** in a routing handler/proxy design; Next.js `permanentRedirect()` returns 308, so do not mistake it for 301. Keep current and historical slugs globally reserved and invalidate old/new lookup keys on rename.
- Reserve application routes (`api`, `q`, `setup`, `dashboard`, `admin`, `login`, `register`, `pricing`, `_next`, etc.); validate lowercase slugs of 3–40 characters.
- Show a friendly unavailable page for known unpublished/suspended restaurants; unknown slugs may return 404. Invalidate public visibility on publish/unpublish, suspension/restore, deletion, and slug changes.
- Implement and verify [the caching contract](CACHING.md), including fresh prices after save and isolation between restaurants.

Exit: low-end Android/slow-4G LCP below 2.5 seconds, target public-route JavaScript below 100 KB (define transferred/compressed measurement), working QR after rename, and changes visible within seconds on new requests. First misses and periodic refreshes still query the database; cached pages do not make an idle database permanently available.

## Phase 3 — phone-first owner dashboard and images (7–10 days)

- Authenticated dashboard layout, tenant picker, categories/items/variants CRUD, reorder, and availability toggles. Persist batches/reorders in transactions.
- Route every mutation through tenant authorization, role checks, and Zod. Use SWR for private reads, with keys containing authenticated user + verified restaurant. Clear its provider on logout/identity change.
- Revalidate only after a successful database commit. Invalidate public cache and refresh the SWR resource after every relevant save. MVP saves go live immediately for published menus; add full draft revisions only after demand.
- Add restaurant settings, tax display configuration, logo/cover, and phone preview. Store 13% VAT and 10% service charge as configurable display values, not hardcoded claims of legal applicability.
- Cloudinary uploads: authenticated server-signed image-only uploads, tenant-specific public IDs/folders, restricted formats, bounded bytes/dimensions, metadata stripping, and server verification of the resulting asset. Upload signature is issued only after role checks. Validate limits server/provider-side, not only with browser options.
- Store Cloudinary public ID and version; derive delivery URLs using the configured account. Reject arbitrary imported image URLs. Use versioned responsive transformations with automatic format/quality and avoid paying for a second optimization layer unnecessarily.
- Owner confirms template prices before publishing; the database publish operation checks the gate atomically.

Exit: an owner manages their complete menu on a phone; upload abuse, cross-tenant assets, stale prices, failed mutations, and cache refresh behavior are tested.

## Phase 4 — fast onboarding, imports, and printable QR (4–5 days)

- Signup → name/slug → optional branding → choose input method → mobile preview → confirm prices → publish → download QR.
- Starter categories from the PDF: Momo, Chowmein & Noodles, Thukpa, Khaja Set, Newari Items, Sekuwa & Grill, Thakali & Nepali Meals, Dal Bhat, Snacks, Tea & Coffee, Lassi & Juices, Cold Drinks, Beer & Bar, Desserts.
- Mark starter prices as examples. Support manual entry, paste-a-list, and CSV with `category,name,name_ne,description,variant,price,available,diet,spice`. Include sample CSV; repeated item names with different variants become one item with variant rows.
- Parse decimal currency strings to integer paisa without floating-point rounding. Validate every row, show errors and a preview, then require import confirmation. Import appends; replacement is a separate destructive flow.
- Bound file size/row count, reject external image columns, and use idempotency to avoid duplicate imports on retry.
- Generate PNG/SVG QR from the canonical production domain and immutable short code; add a print stylesheet/table tent suitable for Print to PDF. Test actual printed scans before distribution.

Exit: fresh testers publish in under five minutes without help; template gate, variant imports, and QR downloads work on mobile.

## Phase 5 — subscriptions, super-admin, reliability, Vercel, and pilot (5–7 days)

- Track manual eSewa/Khalti/Fonepay/bank payments; do not handle food payments. Add admin-only tenant list, payment recording, trial extension, suspension/restore, and audited read-only support views.
- Proposed policy to validate: 30-day trial, payment reminders, 7-day payment grace, then editing lock, then a separately communicated suspension date. Public menu remains available through grace and editing lock. Pricing and deadlines are product decisions, not settled by the PDF.
- Put billing transitions behind trusted server operations. Admin status must not be editable through user profile or metadata APIs. Test admin bypass attempts.
- Add distributed rate limiting for auth-sensitive endpoints, slug checks, import, upload signing, and admin actions; errors and uptime monitoring with PII scrubbing.
- Set up scheduled off-provider database backups, separately cover auth/config and Cloudinary assets, and perform a documented restore drill. Confirm plan-specific backup/retention capabilities.
- Add account deletion/export, abuse reporting, support contact, and reviewed Terms/Privacy. Obtain local professional advice on invoicing/tax obligations before charging.
- Import the repository in Vercel (or use `npx vercel`), choose Next.js, set environment values, deploy preview, configure Supabase redirects, verify production domain/HTTPS, then deploy production. No generic `vercel.json` or Vercel runtime SDK is required.
- Verify production cache invalidation across deployments/regions, auth responses' no-store headers, tenant tests, image delivery, QR scans, and mobile performance.
- Run three restaurants for at least two weeks with owners updating their own menus. Measure signup → first published timestamp and support interventions.

Exit: tenant isolation tests pass, restore is demonstrated, monitoring is active, owners update independently, and commercial hosting/database/media capacity is budgeted.

## Phase 6 — after the pilot

Prioritize from observed demand: reviewed AI photo/PDF import, Nepali interface toggle, featured/scheduled items, daily aggregate scan counts, staff UI/audit history, more themes/custom domains, and subscription gateway integration. Do not add ordering or POS by default.

## Schedule and service decisions

Estimate: roughly **5–7 full-time development weeks**, followed by **two weeks of pilot observation**; allow more time for learning and part-time work. Gates matter more than dates.

- Vercel Hobby permits personal, non-commercial use only. The PDF's suggestion that any unpaid business pilot is automatically eligible is too broad; confirm eligibility or use a commercial plan before business use. [Vercel Hobby documentation](https://vercel.com/docs/plans/hobby).
- Supabase free projects may be paused after inactivity. Plan paid production capacity and backups before restaurants depend on the service; caching does not fix unavailable auth or database cache misses. [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
- Cloudinary bills/limits vary with storage, transformations, and delivery. Set upload quotas and usage alerts; verify current account allowances rather than carrying over the PDF's R2 cost estimate. [Cloudinary documentation](https://cloudinary.com/documentation/node_quickstart).
- Review current service terms/pricing before purchase; the original PDF's monthly cost table does not describe this replacement stack.

Next concrete step: deploy and verify the Phase 3 owner workflow, then implement Phase 4 templates, paste/CSV import with review, and printable/downloadable QR codes. Complete Vercel/mobile performance checks alongside that work.
