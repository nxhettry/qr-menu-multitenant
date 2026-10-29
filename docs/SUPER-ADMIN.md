# Super-admin portal

`/admin/login` signs in accounts listed in `private.super_admins`. Every other account is signed out with a generic error. Admin status is checked on every request by `public.is_super_admin()`. It is never read from user metadata.

## Setup

1. Apply `supabase/migrations/202610290001_super_admin.sql`.
2. Add `SUPABASE_SECRET_KEY` (the service-role key) to the server environment. It is used only for setting a user's password and for disabling or enabling sign-in. Without it, those two actions show a configuration error. Everything else still works.
3. Register a normal account, then promote it in the SQL editor:

   ```sql
   insert into private.super_admins(user_id) select id from auth.users where email = 'you@example.com';
   ```

## What admins can do

- **Overview:** user, restaurant, menu-item and QR-scan totals, plus recent activity.
- **Restaurants:** search by name, address or QR code, and filter by status (20 per page). Suspend or restore a restaurant; restoring returns it to its previous status. Open the normal editor, QR panel and print sheet for any restaurant. `private.is_member` and `private.can_edit` treat super admins as members, and admins bypass suspension and editing locks.
- **Users:** search by email or by restaurant name or address. Set a password, disable or enable sign-in, and send a reset email. Other admins' accounts can't be changed from the portal.
- **Activity:** the audit feed with keyset pagination, optionally filtered to one restaurant.
- **Account:** change your own password. Your current password is required.

Every admin change is written to `audit_events`.

## Data and performance

- Lists are paginated in the database (`limit`/`offset`, at most 50 rows). Search input is debounced by 350 ms, LIKE wildcards are escaped, and the query is mirrored to the URL. The first page is server-rendered and handed to SWR as fallback data, so it isn't fetched twice.
- The activity feed uses `(created_at, id)` keyset pagination on `audit_created_idx`.
- QR scans are counted in `menu_scan_days` (one row per restaurant per Nepal-time day) through `record_menu_scan`, which runs from `/q/[shortCode]` in `after()`, so the redirect isn't delayed. Direct `/<slug>` visits are not counted. No guest data is stored.

## Terms consent

Registration requires accepting `/terms` and `/privacy`. The accepted `TERMS_VERSION` from `src/lib/legal.ts` goes into sign-up metadata. An `auth.users` insert trigger copies it to `profiles.terms_version` and `profiles.terms_accepted_at`. When the terms change materially, bump `TERMS_VERSION` and `LEGAL_UPDATED`.
