# Curated dish image library — generation plan

Drafted 29 October 2026. Feeds Phase 4B (dish catalog) and 4C (shared image library) in [PHASE-4-PLAN.md](PHASE-4-PLAN.md). Nothing here is implemented yet.

## Goal

Owners pick a ready-made photo for common dishes instead of uploading one. Only unusual dishes need an upload. The source list is [data/nepali-menu-items.xlsx](data/nepali-menu-items.xlsx) (587 items, 19 categories).

## How it fits the existing design

| Existing piece (Phase 4) | What this plan adds |
| --- | --- |
| `public.dishes` (seeded catalog) | Seed migration generated from the spreadsheet: `name`, `name_ne`, `tags`; extra names become `aliases`. |
| `public.media_assets` (`source = CURATED`, `visibility = PUBLIC`, `dish_id`) | One row per approved image, with `sha256` for dedupe. |
| Cloudinary `library/<dishId>/…` | Upload destination for approved images. |
| Item form image picker (PUBLIC assets for the item's `dish_id`) | No change; the library simply gets populated. |

## 1. Reduce 587 items to about 350 images

Many items look the same, so one image serves a whole **image group**.

- Add an `image_group` column to the spreadsheet. Variants share a group: all chicken-momo styles with the same look, `Veg Fried Rice` and `Egg Fried Rice` stay separate, but `Mineral Water 500ml` and `1L` share one.
- Dishes whose protein is visible (chicken vs buff vs mutton) keep separate images; sauces and toppings that look identical share.
- Branded products (Coca-Cola, Gorkha Beer, Red Bull, Old Durbar and similar) get **generic** images (a cola glass, a beer glass, a whisky glass). No logos or brand packaging, to avoid trademark problems.
- Dishes that are rarely photographed well or very regional stay out of the first batch and are left to owner uploads.

Expected result: roughly 330–380 distinct images. The final number comes from grouping, not a guess.

## 2. Visual style (decided once, applied to every prompt)

- Top-down or 45° photo, one dish, plain neutral surface, soft natural light, no hands, no text, no logos, no people.
- Serve in realistic Nepali context: steel plate or bowl, leaf plate for Newari items, clay cup for chiya, brass for thali.
- Master size 1600×1200 (4:3). Cloudinary transforms produce card, thumbnail and detail sizes, so no per-size generation.
- Prompt template (stored in code, one source of truth):

```
Photograph of {name_en} ({description}), served in {vessel}, {angle} view,
soft natural window light, neutral {surface} background, appetising,
realistic home-style presentation, no text, no logo, no people, no hands.
```

- Each dish needs a short `visual_description` (shape, colour, garnish) so the generator draws the right dish. Momo, thali, sel roti, chatamari, yomari and choila are the ones generators most often get wrong, so they get hand-written descriptions.

## 3. Pipeline

A script, `scripts/generate-dish-images.mjs`, run by an admin from a terminal. Same pattern as the existing `scripts/generate-*.mjs`.

1. **Read** the spreadsheet; select rows where `image_status = Pending`, one per `image_group`.
2. **Generate** with the chosen provider (decision D1). Resumable: every result is written to `scratch/dish-images/<slug>.png` and the status column is updated, so a crash or rate limit never repeats paid calls.
3. **Review.** The script builds a contact-sheet HTML page (grid, name beside each image, approve / reject / note). Rejected images are regenerated with the note appended, at most 3 attempts per dish; after that the dish is marked `Needs manual photo`.
4. **Optimise.** `sharp` (already a dependency) resizes to the master size, strips metadata, converts to WebP, and computes `sha256`.
5. **Upload** to Cloudinary under `library/<dishId>/`, then insert the `media_assets` row (`CURATED`, `PUBLIC`, `dish_id`, width, height, version, `sha256`). Re-running skips existing hashes.
6. **Status** in the spreadsheet changes to `Approved` and then `Published`.

Accuracy matters more than speed. A human checks every image: a wrong-looking momo or dal bhat set embarrasses a restaurant that picks it.

## 4. Build order

1. Add `image_group`, `visual_description` and `vessel` columns to the spreadsheet; review the Nepali names with a native speaker.
2. Dish catalog seed migration (part of 4B) generated from the reviewed spreadsheet.
3. Generation script plus a pilot of ~20 dishes across different categories to lock the style and prompt.
4. Full batch in category order (Momo, Thali, Newari first), reviewing each batch before the next.
5. Upload and `media_assets` insertion (needs the 4C schema).
6. Browser check at 390 px of the picker with real images (`interactive-browser-verification` skill).

## 5. Verification

- Script tests with a stubbed provider: resumability, hash dedupe, attempt limit, status transitions.
- Spot check that every `Published` asset has a `dish_id`, a PUBLIC row and a loading Cloudinary URL.
- Picker shows the right images for a dish and its aliases; images load fast on a throttled mobile connection.

## Decisions needed

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Which image generator and budget? | Pick one with good food realism and an API; run the 20-dish pilot on two providers and compare before the full batch. |
| D2 | Aspect ratio of menu photos | 4:3 master; confirm against how the current item card crops images. |
| D3 | Branded drinks | Generic images only, no logos. |
| D4 | Who reviews images and Nepali names | A named person, since AI images of Nepali dishes need a local eye. |
| D5 | Label images as AI-generated? | Mention it in the terms or admin docs; no on-image watermark. |
| D6 | Scope of the first batch | Top ~150 dishes (momo, thali, curries, chowmein, tea/coffee, common drinks), then expand. |
