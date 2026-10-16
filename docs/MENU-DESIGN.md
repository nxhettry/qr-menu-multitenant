# Public menu and specials

The public menu follows the supplied reference: warm ivory styling, restaurant logo/name, search, horizontal category filters, a specials hero, and a responsive dish grid. Phones show two cards per row; wider screens show three. There are no cart or favourite controls, ratings, or checkout.

## Owner controls

1. Open a restaurant in the dashboard, then add or edit an item.
2. Set **Diet** to show a green **Veg** badge or red **Non-Veg** badge. Egg has a red **Egg** label; unspecified diet shows no badge. Text accompanies the colors.
3. Check **Feature in specials banner** and save. Up to six non-deleted items can be featured per restaurant, including items in hidden categories. Uncheck it to remove a special. Banner order follows category/item order.
4. Add an item photo through **Item photo**. The banner uses the selected item's photo, falling back to the restaurant cover from **Settings & images**. Logo uploads in settings appear beside the restaurant name; initials appear when no logo is configured.

The banner only shows available featured items in visible categories, with at least one available variant when variants are used. It shows the single price or the lowest available variant price. Guests can switch specials with arrows or labeled dots; there is no autoplay. The Specials filter shows featured dishes, including sold-out ones with their availability labels.

Search matches words across item/category names, descriptions, Nepali text, and variant names. Search combines with the selected category. Clear search or **Show all dishes** resets the applicable filters. Search is local to the loaded menu and uses a deferred query and a memoized index.

## Database

`202610160003_featured_menu.sql` is applied to Supabase project `hrkubaulqmegbbvuuwsj` as `20261016185102_featured_menu`. It adds the featured flag, a database guard for the six-special limit, and updates the existing mutation/public projection functions. Existing rows default to unfeatured. No live restaurant content or publication state was changed. Old clients that omit the flag preserve its current value.

The authenticated Supabase client waits for a real request before initializing the session SDK, avoiding the observed Next.js partial-prerender error caused by its session clock access.

## Verification and deployment

The SQL tests cover featured saves, tenant isolation, limit rollback, public projection, and hidden categories. Search tests cover dish/category/Nepali/variant matching and combinations with selection. The production/browser harness exercises the actual Server Actions and migrations with isolated PostgreSQL and stub Auth. Its Cloudinary responses use a small test illustration to verify image rendering without modifying real assets.

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run check:editor-browser`. Browser screenshots are saved under ignored `artifacts/`. After the isolated harness, run `npm run build` to restore a production build with the normal environment; `node scripts/check-http.mjs` checks the existing public/auth routes.

The final production/browser run passed menu search, category and Specials filtering, both diet colors, saved featured flags, manual banner navigation, decoded logo/hero images, phone overflow checks at 390 px and 320 px, desktop layout, and the existing editor/auth/cache regression checks with no unhandled browser errors. All 33 automated tests, lint, TypeScript, the normal production build, and HTTP regression checks passed. The public route measured **149.2 KiB gzip** of initial modern-browser JavaScript, above the original 100 KB target.

Push and deploy the source to expose the design on Vercel. The database migration is already applied and must not be reapplied there. Deployed Auth, real photo delivery, physical-phone behavior, and slow-network performance still require deployment checks. The original public JavaScript budget remains an open performance target; see the phase status documents.
