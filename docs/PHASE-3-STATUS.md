# Phase 3 — owner menu editor

The subsequent public menu redesign, featured-item migration, owner instructions, and latest verification are recorded in [Menu design](MENU-DESIGN.md).

The supplied **QR Menu SaaS — Revised Build Plan.pdf**, dated 15 October 2026, was read in full (11 pages). This implements its M3 owner-dashboard milestone using the already selected Supabase, SWR, and Cloudinary stack. It does not replace the established stack with the PDF's Neon/Prisma/Better Auth/R2 alternatives.

## Available

- `/dashboard/{restaurantId}`: verified restaurant access, restaurant switching, and user/restaurant-scoped SWR data. Failed authenticated refreshes hide cached private data. Owners and managers can change settings and publication; editors can manage menu content; suspended/locked restaurants remain readable.
- Categories: add/edit, Nepali name, visibility, remove after moving/removing contained items, and transactional reordering. Desktop drag handles and touch/keyboard up/down buttons use the same validated reorder operation.
- Items: add/edit/move/remove, English/Nepali names/descriptions, single price or up to 30 ordered variants, availability, diet, spice, and item photos. Decimal rupee input is parsed directly to integer paisa. Item and variant changes commit or roll back together.
- Settings: name, reserved/history-preserving slug, description, phone/address/map link, theme color, opening hours, and configurable VAT/service-charge display.
- Private saved-menu preview in a phone-width frame. Hidden categories are omitted; draft content remains inaccessible anonymously.
- Publish/unpublish: verified owner/manager, visible-content requirement, atomic example-price confirmation gate, and preserved first-publication timestamp. Saved changes on published menus go live immediately.
- Server uploads: authenticated, same-origin POST; at most 3 MiB/file, JPEG/PNG/WebP bytes verified through Sharp, at most 20 megapixels and 12,000 pixels on either source edge, output resized to at most 1600×1600, metadata stripped, then signed SDK upload to a generated tenant-specific Cloudinary ID. Cloudinary's result is checked before attachment. Invalid/expired/cross-tenant reservations are rejected; a database-backed quota allows 20 attempts per restaurant per rolling 24 hours.
- Images have a neutral failure placeholder and responsive, versioned Cloudinary delivery. Removal detaches the image; it does not immediately delete older assets that cached pages may still reference.
- Every committed edit invalidates the restaurant and relevant current/previous slug tags. Upload route handlers use immediate `revalidateTag(..., { expire: 0 })`; Server Actions use `updateTag`. Failed writes do not invalidate. A post-commit invalidation failure reports that the save succeeded with delayed refresh rather than claiming a rollback.
- Public content and metadata render at request time from the cached repository. This fixes a reproduced stale rendered-page case after unpublish → publish while preserving warm full-menu query reuse. The application does not promise complete HTML CDN caching for every scan.

## Database activation

`supabase/migrations/202610160002_owner_editor.sql` was applied to project `hrkubaulqmegbbvuuwsj`, recorded remotely as **20261016105633_owner_editor**. Existing rows were checked for incompatible text/assets before applying it. No restaurant content or publication status was changed.

The migration adds a private upload-reservation table, transaction-scoped mutation RPC, RLS-backed snapshot RPC, tenant asset constraints, audit events, and parent-menu timestamps on content changes. Mutations serialize against the restaurant row; reorder batches require the complete current tenant-scoped set.

Live checks confirmed authenticated owner snapshot access, anonymous RPC denial, and client denial of private upload reservations. The security advisor reports expected notices for private tables with no client policies and deliberately callable, authorization-checked functions. It also reports that [leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); that Auth configuration remains a pre-launch task. Function advisory references: [anonymous callable functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated callable functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [private RLS tables](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Verification

- **31 automated tests passed**, including transactional rollback, cross-tenant operations, owner/editor permissions, settings/QR history, publication/example gates, private snapshots, image reservations/expiry/quotas, and image format/metadata processing.
- Production integration checks passed against both actual migrations in isolated PostgreSQL. Tests invoke the real Next.js Server Action endpoint and verify immediate price/publication cache invalidation, failed-write preservation, cached unavailable → published transition, private SWR response headers, signed-out/cross-tenant rejection, private preview rendering, same-origin upload checks, and invalid-image rejection. The Auth service is stubbed for these isolated tests.
- A 32×32 image was uploaded through the actual Cloudinary helper, verified, and immediately deleted. No live user restaurant asset was attached or replaced.
- `npm run check:editor-browser` passed in the installed Chromium browser at a 390×844 phone viewport: category/item creation, single-price → variants, variant ordering, availability, mobile category ordering, invalid image rejection, settings/slug rename, private preview, unpublish/republish, restaurant switching, logout, no private content after logout, no horizontal overflow, and no unhandled browser errors. The script saves a local screenshot under ignored `artifacts/`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if Chromium is installed somewhere other than the default Windows Chrome path.
- Lint, TypeScript, the normal production build, and all existing HTTP regression checks passed. The final `.next` build uses the normal local environment; `check:public-menu` deliberately builds against a temporary local test backend, so run `npm run build` after that command before starting the app normally.

## Remaining

- Source changes need to be pushed/deployed before the Vercel site exposes the editor. The cloud migration is already applied; do not reapply it manually.
- Physical-phone and deployed Vercel checks remain, including native drag/drop, keyboard focus review, camera/gallery upload, and the complete workflow against real Auth. Local automated browser tests use a stub Auth service and a real isolated SQL schema.
- Latest modern-browser public JavaScript measurement: **142.4 KiB gzip**, still above the original 100 KB budget. Actual slow-4G LCP and Vercel-region invalidation need deployment verification.
- Phase 4: starter templates, paste/CSV import with preview/idempotency, automatic slug suggestion/availability checks, and QR PNG/SVG/print sheets. Example-price gating is ready for these imports.
- Phase 5: distributed rate limiting, billing/admin, monitoring, backups/restore, account deletion/export, abuse handling, and policies. Expired upload reservations and detached Cloudinary assets need a scheduled retention/cleanup policy.
