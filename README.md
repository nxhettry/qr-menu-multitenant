# QR Menu

QR-menu SaaS foundation and owner-account setup for Nepali restaurants. Adapted from the supplied revised build plan to **Next.js App Router, Tailwind, Supabase, Cloudinary, SWR, and Vercel**.

Start with [the phased build plan](docs/BUILD-PLAN.md) and [the caching contract](docs/CACHING.md).

See [Phase 1 status](docs/PHASE-1-STATUS.md) for verified service connections, implemented auth/onboarding code, the enabled local Supabase OAuth MCP configuration, and pending cloud database activation.

## Run locally

Node 24 LTS was used for setup. From this folder in PowerShell:

```powershell
npm.cmd run dev
```

Open http://localhost:3000. The demo requires no cloud credentials.

| Route | Available now |
| --- | --- |
| `/` | Foundation landing page and build stages |
| `/momo-house` | Cached, server-rendered sample menu with variants and NPR prices |
| `/q/7Kx2pQa` | Uncached 302 to the sample menu; demonstrates permanent QR routing |
| `/setup` | SWR connection check and setup guidance |
| `/api/health` | Non-sensitive application health with no-store headers |
| `/register`, `/login` | Owner account forms using Supabase Auth |
| `/forgot-password`, `/reset-password`, `/auth/callback` | Email confirmation and password recovery |
| `/onboarding`, `/dashboard` | Authenticated restaurant creation/list; requires the foundation migration |

The sample restaurant and prices are illustrative. Auth, onboarding, and tenant SQL are implemented locally; the cloud schema, real confirmation/recovery emails, and authenticated end-to-end flow still need activation and verification. Uploads, editing, imports, billing, and deployment are later phases.

## Configure services for Phase 1

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Edit `.env.local` locally; never commit or paste secrets into source. It is ignored by Git; `.env.example` is tracked.

1. Create a development Supabase project. In its connection/API settings, copy the project URL and publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Apply `supabase/migrations/202610160001_foundation.sql` to the intended development project after inspecting its existing tables/migrations. Supabase OAuth MCP is configured locally; its database tools must be available in the active session before activation. Add `http://localhost:3000/auth/callback` to the auth redirect allowlist, configure the Auth Site URL, verify email/password settings, and configure SMTP for real users. Google OAuth is a later addition.
3. Create a Cloudinary environment. Set the public cloud name and the server-only API key/secret. The starter does not expose upload signing before authorization is implemented.
4. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally. Use the canonical HTTPS production domain for customer QR generation later.

Client factories are provided in `src/lib/supabase`; the server-only Cloudinary factory is in `src/lib/cloudinary/server.ts`. Environment validation runs when these integrations are used, so the fixture remains usable before setup. No service-role key is needed for normal application traffic.

Existing Cloudinary settings entered during setup were preserved in ignored `.env.local`; complete any missing values there. Only the `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` names are consumed by the helper.

## Project structure

```text
docs/                     Phased plan and caching policy
src/app/                  Built-in Next.js routes, layouts, and HTTP handlers
src/components/           Setup SWR boundary and connection status
src/lib/menu/             Cached public demo repository; replace in Phase 2
src/lib/supabase/         Browser, authenticated server, cookie-free public clients
src/lib/cloudinary/       Server-only SDK configuration
src/lib/env/              Environment validation
```

Public menu data uses `use cache`, restaurant/slug tags, and explicit cache lifetimes. SWR stays inside client boundaries; the root layout does not add it to the public menu bundle. See the caching contract for authorized mutation invalidation, account-specific SWR providers, status changes, and already-open browser freshness.

## Check and build

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run start
```

Use `npm ci` to reproduce installed dependency versions from `package-lock.json`. `npm test` runs migration/RLS checks in embedded PostgreSQL and auth redirect/validation tests, without changing Supabase or sending emails. `npm run check:services` performs read-only Supabase and Cloudinary credential checks without printing credentials.

The initial full npm audit reports five high-severity findings along the development-only `eslint-config-next → fast-glob → micromatch → braces` dependency chain. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) currently lists no patched version. npm's suggested forced fix downgrades the Next.js ESLint configuration to version 14; it was not applied. Recheck when updating tooling; keep untrusted generated glob patterns out of local lint commands.

## Vercel deployment (Phase 5)

Vercel is a hosting service, not a required runtime package. Connect the repository in the Vercel dashboard, select Next.js, and use `npm run build`. Alternatively, use `npx vercel` when ready to log in and link a project. Set separate preview/production environment values and configure Supabase redirect URLs for the deployed origin. No cloud accounts or deployment were created by this local setup.

Before a business pilot, confirm commercial hosting eligibility and production database availability. [Vercel Hobby](https://vercel.com/docs/plans/hobby) is restricted to personal non-commercial use. [Supabase's production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) covers free-project pausing and production safeguards. Recheck pricing and Cloudinary usage limits before launch.
