# Bulk menu entry and display controls

Use **Dashboard → restaurant → Bulk import**. Download the Excel workbook or UTF-8 CSV, replace its example rows with real items, upload it, review the preview, check the price/allergen confirmation, then import. The workbook has a separate Instructions sheet and dropdowns for boolean/diet/spice values.

The hierarchy is **Category → Subcategory → Item → Variants**. For example:

| category | subcategory | name | variant | price | type |
| --- | --- | --- | --- | --- | --- |
| Momo | Chicken | Steamed momo | Half plate | 150.00 | Non-veg |
| Momo | Chicken | Steamed momo | Full plate | 250.00 | Non-veg |
| Chowmein | Buff | Fried noodles | | 200.00 | Non-veg |

Subcategories are optional and limited to one level. Diet is an independent item field. Existing menus can continue to hold items directly in a top-level category; existing content is not automatically reclassified.

## Spreadsheet fields

Only `category`, `name`, and `price` are required columns. The downloadable template includes:

- Names: `category`, `subcategory`, `name`, `name_ne`, `description`, `description_ne`.
- Portions: `variant`, `variant_ne`, `price`, `variant_available`.
- Classification and flags: `type`, `available`, `visible`, `popular`, `new`, `featured`, `tags`.
- Optional details: `prep_minutes`, `calories`, `spice`, `allergens`, `allergen_notes`, `addons`, `hidden_fields`.

Use decimal rupee prices without currency symbols or thousands separators. The parser converts the decimal string to integer paisa. Use TRUE/FALSE (yes/no and 1/0 are also accepted). Available/variant_available/visible default to TRUE; popular/new/featured default to FALSE. Diet accepts Veg, Non-veg, Egg or blank. Spice uses the existing 0–3 scale.

For multiple portions, repeat all item metadata exactly and change only `variant`, `variant_ne`, `price`, and `variant_available`. Each variant name must be distinct. An item has either one base price or up to 30 variants.

Separate tags and allergens with `|`. Add-ons use `Extra achar:30|Cheese:50`; import creates an optional Extras group. The item editor supports multiple named groups, minimum/maximum choices, per-option prices, and availability. Groups are stored per item as validated JSON; they are not a shared add-on library. Add-ons describe the menu; there is no cart, ordering or payment workflow.

Use `hidden_fields` to hide optional information on one item: `photos|description|nepali|diet|spice|preparation|calories|tags|badges|allergens|addons`. These values can also be controlled with item-editor checkboxes. **Menu display** sets menu-wide defaults; a field hidden there remains hidden even when enabled on an individual item. Names, prices, portion information and sold-out status remain visible for visible items.

## Review and persistence

Imports append new items. They never update existing items. The preview flags an existing category/subcategory/item-name combination; remove or rename that row before importing. Existing category/subcategory names are reused without changing visibility. Names are compared without case or surrounding whitespace in the database; preview also normalizes Unicode for possible duplicate detection.

The entire confirmed batch commits in one tenant-authorized database transaction. Invalid items, duplicate names, category/item limits or a seventh featured item roll back the whole batch. An idempotency receipt prevents a retry of the same request from inserting items twice. A changed payload cannot reuse that request ID. The public cache is invalidated after commit and the owner's SWR snapshot is refreshed.

Limits: 1 MB file, 1,000 data rows, 200 grouped items, 100 categories/subcategories combined, and 1,000 items per restaurant. The server additionally bounds the normalized import payload. Formulas, date/link cells, arbitrary image URL columns and unsupported headers are rejected. Add item photos through the existing upload flow after import.

## Visibility and mobile UI

Availability and visibility are independent. Unavailable items show Sold out. Hidden items never enter the public projection, search, filters or specials; owners retain them in their editor. Hiding a parent category hides all its subcategories. Hidden optional details are omitted/redacted from the guest projection and retained in the private snapshot. Preview uses the same visibility rules.

The guest menu retains two cards per phone row and three on wider screens. Opening add-on or allergen information expands that card to two grid columns for readability. Category and subcategory filters scroll horizontally. Nepali content, keyboard focus, text diet labels and reduced-motion styling are retained.

## Maintenance

- Migration: `supabase/migrations/202610170001_bulk_menu.sql`. Applied to Supabase project `hrkubaulqmegbbvuuwsj` as `20261017070556_bulk_menu` on 17 October 2026, following explicit authorization. Do not reapply it there. For a new database, apply once after the foundation/editor/featured migrations.
- Regenerate both static templates: `npm run generate:menu-template`.
- Validation: `npm test`, `npm run lint`, `npm run typecheck`, and `npm run check:editor-browser`.
- The isolated browser harness covers actual Excel download/import, duplicate CSV review, rich item editing, visibility and responsive screens. Screenshots are written to ignored `artifacts/`.
- The harness builds with stub services. Run `npm run build` afterward to restore the normal production build.

## Local verification

The complete automated suite passed 44 tests. The production browser harness passed actual Excel download/import, duplicate CSV review, nested category creation, variant prices, add-on editing, item/global visibility, keyboard activation, and layout checks at 320, 390 and 1280 px. Open detail cards were visually reviewed and expand to two columns for readable phone content. Lint and TypeScript checks passed. These checks use isolated fixtures and browser emulation, not live restaurant writes or physical devices.

The public route measured 150.7 KiB gzip of initial modern-browser JavaScript including framework runtime. Excel parsing loads only in the owner import flow. The earlier 100 KB public JavaScript target remains unmet.

## Cloud verification

After migration, row counts were unchanged: one restaurant, two categories, one item and two variants. The existing menu remains published and its public projection returns two categories. The new columns exist, existing item details pass validation, and existing items remain visible. Authenticated callers can execute the tenant-checked mutation RPC; anonymous callers cannot. The legacy mutation implementation is private, and the import receipt table has RLS enabled with direct client access revoked.

The security advisor reports [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) on private server-owned tables, including import receipts; this intentionally denies direct client access. It also flags the intentionally callable [public read RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), whose projections and tenant/role checks are covered by the existing tests. The separate Auth advisory says [leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); this migration does not change Auth settings.

Cloud schema activation is complete. The hosted site's UI still requires deployment of the updated application source.
