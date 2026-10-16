# Phase 1 status — 16 October 2026

## Cloud activation update

The foundation SQL was subsequently applied through Supabase MCP to project `hrkubaulqmegbbvuuwsj`, recorded remotely as migration `20261016085813_foundation`. All 12 application tables have RLS enabled. Live checks verified anonymous table-read/onboarding denial and public lookup execution. The owner now reports deployed login and restaurant creation working. The activation-pending notes below describe the earlier local setup. Generated database types, a separate preview database, SMTP setup, and a complete confirmation/recovery test still need verification.

## Verified service configuration

- Supabase project Auth settings API accepted the configured publishable key.
- Cloudinary accepted an authenticated, read-only API ping.
- Credentials were loaded from ignored `.env.local` and were not printed or copied into application responses.
- `NEXT_PUBLIC_SUPABASE_DATABASE_URL` is an unused, database-labelled setting, not a Postgres connection string. The app uses `NEXT_PUBLIC_SUPABASE_URL` and the publishable key; no database password is required by the application or OAuth MCP connection.

## Implemented locally

- Supabase session refresh in Next.js `src/proxy.ts`, limited to authentication/private routes; public menus stay outside auth processing.
- Registration, email/password sign-in, email confirmation callback, password-reset request/update, and local sign-out.
- Server-verified identity for dashboard/onboarding/private API operations. Callbacks allow only three application destinations and use the configured canonical site origin.
- Restaurant creation UI calling a transaction RPC that creates the restaurant, OWNER membership, profile if needed, 30-day trial, and audit event together.
- Dashboard restaurant list with a user-keyed SWR provider and resource key. HTTP responses are private/no-store. SWR hides previous data after a fetch/access error.
- `getTenantContext()` validates restaurant IDs and membership, returns 404 for another tenant, and enforces role/edit-lock checks through `can()` and database RLS.
- Browser-facing env validation rejects secret/service-role keys.

## Migration prepared, not applied to the cloud

`supabase/migrations/202610160001_foundation.sql` creates the tables, indexes, RLS policies, explicit grants, private permission helpers, immutable QR IDs, slug reservations/history, a deferred single-price/variant invariant, and public menu projection functions. Membership/billing/admin/publishing writes are denied to normal clients; these require dedicated trusted operations in later phases.

`momo-house` is reserved while it serves the fixture, so onboarding cannot claim an address that already displays a sample menu.

Supabase MCP is now configured and enabled in the local Codex CLI at `mcp.supabase.com/mcp`, with OAuth authentication reported by `codex mcp list`. The current chat has not exposed its database tools, so a live MCP database request and cloud migration are still pending. The configured server is not project-scoped; verify the intended project before any database changes. Once the tools are available:

1. Match the project to the configured API URL and inspect current schemas/tables and migration history.
2. Apply the reviewed migration only to the intended development project. If names collide with existing application tables or an existing private schema has other purposes, adapt the migration rather than dropping or overwriting data.
3. Generate database TypeScript types and bind the Supabase clients to them.
4. Run the security checks against the actual development database in a rolled-back test transaction and review Supabase security advisors.
5. Configure Auth Site URL and allowed redirect URLs, including `http://localhost:3000/auth/callback` locally; use the canonical production origin at deployment. Confirm email/password and verification settings; configure SMTP for real users.
6. Verify signup → confirmation → login → restaurant creation → dashboard → logout, and password recovery with a real test account. No account or email was created during the read-only credential checks.

## Tests and limits

Latest local verification: **11 tests passed**, TypeScript passed, and the production build passed. HTTP checks passed for public/auth pages, signed-out dashboard/onboarding redirects, private API `401` responses, callback redirect safety, unchanged QR routing, and no-store headers. The temporary test server was stopped afterward. No browser interaction or real-account email round trip was tested.

`npm test` runs PostgreSQL tests in memory using PGlite, with an emulated Supabase auth schema and roles. It executes the actual migration and verifies transaction creation, tenant read/insert/update/delete protection, role/billing/admin protection, composite foreign keys, variant price constraints, QR/slug behavior, anonymous projection, editor restrictions, suspension, and editing locks. Pure tests cover callback redirects and slug validation.

These tests validate SQL and local application behavior; they do not replace testing Supabase's deployed gateway/JWT/session configuration or the emailed confirmation/recovery flow. Cloudinary upload signing and menu CRUD remain later phases.

Useful commands:

```powershell
npm.cmd run dev
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check:services
node scripts/check-http.mjs
```

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp).
