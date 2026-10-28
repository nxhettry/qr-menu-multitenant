# Caching contract

Next.js server caches, HTTP/CDN caches, the browser router cache, and SWR's client memory are separate layers. Invalidating one does not automatically refresh the others.

## Public menu

Enable Cache Components in `next.config.ts`. Put `use cache` on the public repository function, accepting a primitive slug or restaurant ID as an argument. Never read cookies, headers, sessions, or private tenant context inside this shared cache. Query only the anonymous public projection with a cookie-free client.

Tag with `menu:<restaurantId>` and `menu-slug:<slug>`; slug must be an explicit cache key input. Start with `cacheLife({ stale: 30, revalidate: 60, expire: 300 })`. These are initial tuning values, not a guarantee of background polling. Next.js enforces a 30-second minimum for time-based client router reuse; using `stale: 0` would not promise instant browser freshness and also excludes this content from prerenders. The 60-second revalidation and 300-second expiry are fallback server freshness bounds. Missing slugs receive a slug tag too so creation/rename can invalidate negative lookups.

`src/lib/menu/repository.ts` caches the cookie-free Supabase public projection with these tags and lifetimes. Draft/suspended results and missing slugs are cached by slug; published results also carry their restaurant tag. Onboarding invalidates the restaurant and slug tags after creation. Phase 3 editor actions and image routes use `src/lib/editor/invalidation.ts` after database commit, including current/previous slug tags on rename. The owner SWR hook refreshes its exact user/restaurant key after successful saves.

Public content and metadata wait for a real request with `connection()` before reading the cached repository. An integration check exposed stale rendered unavailable content after a rapid unpublish → publish transition when the whole route was eligible for prerendered reuse. The request boundary prevents that rendered-page reuse while preserving full-projection query caching. HTML is rendered per request; do not claim that every scan is served as complete CDN-cached HTML. Production tests verify warm data reuse and repeated publication transitions.

After an authorized save:

1. Validate identity, membership, role, and payload.
2. Commit the database mutation successfully.
3. From a **Server Action**, call `updateTag('menu:<id>')` and the relevant slug tag(s) for immediate expiration/read-your-own-writes. Call `revalidatePath('/<slug>')` where the rendered path needs refreshing.
4. From a **Route Handler/webhook**, use `revalidateTag(tag, { expire: 0 })` for immediate expiry; `updateTag` is Server Action only. Authenticate webhooks; do not expose a public cache-clearing endpoint.
5. Refresh the affected owner SWR key with `mutate`. Do not rely on `router.refresh()` to invalidate the server data cache.

Use `revalidateTag(tag, 'max')` only for content where one stale response is acceptable; prices, availability, suspension, and unpublishing use immediate expiration. Do not use the deprecated one-argument `revalidateTag(tag)` from the PDF.

Publish/unpublish, admin suspension/restore, soft deletion, branding, item/variant/category changes, and imports all invalidate the menu. Rename invalidates old/new slug lookups and history plus the restaurant tag. Retry or reconcile failed post-commit invalidations; log failures without pretending the write rolled back. Define how direct Supabase edits trigger authenticated invalidation or accept the fallback TTL.

Already open customer menus will not magically change when a server cache tag expires. Initially they refresh on navigation/reload; if the requirement includes live open screens, add narrowly scoped public SWR refresh (e.g. 30–60 seconds) or a realtime version signal. Treat this as a product/performance choice; keep SWR off the public page until needed to preserve its JavaScript budget. Suspension affects subsequent requests; previously delivered browser content cannot be recalled.

## QR and slug routing

`/q/<shortCode>` responds with 302 plus `Cache-Control: no-store`; lookup freshness matters because the slug can change. Do not permanently cache that redirect. Never print a localhost or Vercel preview origin in customer QR codes. Historical URLs use explicit 301 after resolving their immutable association, with carefully chosen cache policy. Do not recycle old slugs.

The proxy checks historical slugs for valid single-segment restaurant addresses using an anonymous RPC. Historical redirects use 301 plus `no-store`, so successive renames continue to resolve to the current address. Next.js does not apply `use cache` inside Proxy, so `resolveOldSlugCached` in `src/lib/menu/routing.ts` memoizes each lookup per server instance for 60 seconds (bounded to 5,000 entries). Repeat scans of a warm address therefore make no database call, and a warm instance keeps serving its cached menu during a database outage. A rename saved through the app clears the memo in the process that handled it. Another instance may still pass a just-renamed address to the page for up to 60 seconds; the page then finds no menu, resolves history itself, and redirects with `permanentRedirect` (a client-side redirect, because the page streams). Public requests never refresh auth cookies. Lookup failures without a memo entry return an uncached 503 rather than guessing. The reserved demo address bypasses the live database.

## Dashboard, auth, and admin

- Private responses: `Cache-Control: private, no-store`; underlying fetches use `cache: 'no-store'`. Do not add `use cache` to authenticated repositories.
- Proxy session refresh, callbacks, auth, uploads, billing, imports, and admin responses must not enter shared caches. Do not use `force-static` or public s-maxage for these routes.
- Server-verify the session on every protected operation, including SWR GET routes. Cookie-authenticated mutations need origin/CSRF protection. Read routes must enforce RLS and never return privileged internal fields.
- Mount `SWRConfig` within the authenticated dashboard with a new Map provider keyed by verified user ID; include restaurant and resource in every key. On logout/identity switch, unmount/replace the provider and clear visible state. Switching tenants changes keys immediately.
- Use a JSON fetcher that rejects non-2xx responses, revalidates on focus/reconnect, and does not retry 401/403/404 forever. `dedupingInterval` reduces duplicate requests; it is not a freshness TTL.
- After a successful mutation, refresh the same key(s). Optimistic editing may use rollback-on-error, but the server remains authoritative.
- For server-provided initial data, stable SWR supports `fallback`/`fallbackData`. Use hooks only from Client Components. The linked Next.js guide also documents experimental `cacheData` (requires SWR 2.5 beta or later); do not add a beta solely for that API. Match the installed version's types.

The starter `/setup` has a scoped SWR provider and reads `/api/health`, which serves public, non-sensitive application status with no-store. It is a foundation demonstration, not an authenticated dashboard.

## Images

Use Cloudinary public ID + version to generate optimized delivery URLs. A changed version yields a new URL; retain long-lived caching for immutable asset versions. Restrict delivery to the configured account, bound transformation widths, and validate upload ownership. Prefer Cloudinary transformation/CDN delivery rather than optimizing the same image again through Vercel by default.

## Verification gates

- Warm menu requests reuse the cached public query; different restaurants never share menu data.
- After item price/availability save, the next new public request sees the committed result; failed saves leave existing data intact.
- Publish resolves a previously missing/unavailable slug; unpublish/suspend/delete removes cached public content on subsequent requests.
- Slug rename leaves printed QR working, redirects historical URL, and does not reveal another restaurant.
- Private API responses contain no shared cache headers; auth responses with Set-Cookie are never cached.
- Logout and account/restaurant switches reveal no previous private SWR data.
- Test against `next build` + `next start` and a Vercel preview; development caching behavior alone is insufficient evidence.

References checked 16 October 2026:

- [Next.js caching](https://nextjs.org/docs/app/getting-started/caching)
- [Cache lifetime and the client minimum](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [SWR with Next.js](https://swr.vercel.app/docs/with-nextjs)
- [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
