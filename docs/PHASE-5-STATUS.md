# Phase 5 — reliability status

Updated 23 November 2026. Covers the code-only parts of Phase 5 in [BUILD-PLAN.md](BUILD-PLAN.md). Billing, monitoring, backups and the pilot are still open.

## Implemented

- **Migration** `supabase/migrations/202611230001_phase5_reliability.sql` (**not applied to any Supabase project**; apply after the dish catalog migrations). Tested in `scripts/test-phase5.mjs`.
- **Rate limiting.** `private.rate_limits` fixed-window counters behind the service-only `public.rate_limit_hit`. `src/lib/rate-limit` wraps it; policies live in `policies.ts`. Applied to sign-in, sign-up, password reset (per IP), slug checks, menu mutations, bulk import, image uploads, account export/deletion, abuse reports and admin actions (per user). The limiter fails open if the database is unreachable.
- **Account deletion and export.** `/dashboard/account`: JSON export (`/api/dashboard/account/export`) and self-serve deletion with a 14-day grace period. On request, solely-owned restaurants are hidden (`deleted_at`) and their menu addresses are released immediately (renamed `removed-<id>`, history and reservations removed); printed QR codes keep working because they use short codes. Cancelling restores restaurants as drafts with the temporary address. Restaurants with another owner are not deleted.
- **Abuse reports.** Public form at `/<slug>/report` (rate limited, honeypot, Turnstile verified server-side when `TURNSTILE_SECRET_KEY` is set). Super-admin review at `/admin/reports`.
- **Cleanup job.** `vercel.json` runs `/api/cron/maintenance` daily (Bearer `CRON_SECRET`): removes old rate-limit rows, deletes unreferenced Cloudinary uploads, and permanently purges accounts past the grace period (Cloudinary folders first, then database rows and the auth user).
- Support contact is `contact@kree.com.np`; privacy and terms text describe the deletion and export flows.

## Environment to add

`CRON_SECRET` (required for the cron route), `TURNSTILE_SECRET_KEY` (optional). The cron route and the limiter also need `SUPABASE_SECRET_KEY` and the Cloudinary keys.

## Not done

- Billing, trial/grace/suspension, monitoring (Sentry was declined for now), backups and restore drill, tenant-isolation retest on the deployed project, the pilot.
- No browser run of the new pages; the new SQL runs against PGlite only. A user who requests deletion and then creates a new restaurant will lose it at purge time.
- Legal copy was edited to match behavior and has not had professional review. `TERMS_VERSION` was not bumped.
