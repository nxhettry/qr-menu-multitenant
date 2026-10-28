# QR codes and menu addresses

## Owner flow

1. **Onboarding** suggests a menu address from the restaurant name (`suggestSlug` in `src/lib/menu/slugs.ts`). Accents are removed, `&` becomes `and`, reserved words get `-menu`, and names without Latin letters or digits leave the field for the owner to fill. Owners can edit the address freely.
2. While they type, `useSlugAvailability` debounces for 400 ms and asks `GET /api/dashboard/slug-availability?slug=…` (signed-in only, `no-store`). Current and historical addresses both count as taken. **Create restaurant** is disabled while the address is taken. The database still enforces uniqueness on submit.
3. The editor's **QR code** tab (also reachable with **Get QR code** once published) shows the QR, the permanent short link and the readable menu address with copy buttons, PNG/SVG downloads, and two print layouts.

## What the QR encodes

Every QR encodes `NEXT_PUBLIC_SITE_URL` + `/q/<short code>`. The short code never changes, so printed codes survive renames and address changes. The tab warns when the site URL is a localhost address. Set the production domain before anyone prints.

- `GET /api/dashboard/restaurants/<id>/qr` returns SVG; add `format=png` for a 1200 px PNG and `download=1` for a file named `<slug>-qr.<ext>`. Members only, `private, no-store`.
- `/dashboard/<id>/print?layout=cards` prints four 105 × 148 mm table cards with cut lines on A4; `layout=poster` prints one A4 poster. Both are server-rendered with an inline SVG, use the restaurant's accessible accent, and stay light in dark mode. Print at 100% scale and test-scan a copy first.

## Database

`supabase/migrations/202610280001_slug_availability.sql` adds `public.slug_available(text)`, executable by signed-in users only. **Apply it to the Supabase project before deploying this code**; without it, the availability check shows "couldn’t check" and owners can still create restaurants.

## Verification

`npm test` covers suggestions and the SQL function (including anonymous denial). `npm run check:editor-browser` checks that the served SVG matches the expected QR for the restaurant's short link, the PNG download, cross-tenant 404s and signed-out 401s, both print layouts, the availability endpoint, and the QR tab and onboarding address flow in a phone-sized browser. Screenshots are saved under `artifacts/`. Physical print-and-scan testing is still manual.
