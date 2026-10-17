---
name: localized-aesthetic-accessibility
description: Polish a specific qrmenu screen or component for visual hierarchy, responsive usability, and accessibility, including its existing English/Nepali menu content. Use for focused UI improvements and reviews.
---

# Localized aesthetic and accessibility polish

Localize the work to the requested screen or component and its shared dependencies. Respect the restaurant's identity and the existing design language. Use `$design-system-extraction` when available to resolve unfamiliar visual patterns; otherwise inspect `docs/MENU-DESIGN.md`, `src/app/globals.css`, and neighboring components directly.

Read `AGENTS.md` and `node_modules/next/dist/docs/03-architecture/accessibility.md` before implementation. For framework changes, also read the relevant installed guide rather than assuming older Next.js APIs.

## Make a focused assessment

Identify concrete visual problems: competing headings, weak grouping, inconsistent spacing, cramped controls, truncated prices, image distortion, or poorly placed empty/error states. Resolve these through the existing spacing, type, color, and component patterns. Avoid decorative changes that obscure menu content or increase public-page JavaScript without a user benefit.

Review the affected flow for:

- Semantic headings and landmarks; native buttons/links; names on icon-only controls; associated form labels; descriptive page titles for route announcements.
- Logical keyboard order, visible focus, keyboard activation, and focus recovery when dialogs/forms close. Ensure validation messages connect to inputs and status changes are announced without repeatedly interrupting the user.
- Readable text contrast on its actual background, including selected/hover/error states and restaurant-supplied colors. Reuse `accessibleAccent` where appropriate; its result is designed for the ivory background and must be rechecked on other surfaces. Use text/icons with availability and diet colors.
- Usable touch targets, spacing between adjacent controls, text zoom and narrow-screen reflow, and intentional horizontal category scrolling. Avoid essential content that depends only on hovering.
- Meaningful image alternatives, decorative images excluded from announcements, and stable image dimensions. Preserve the existing reduced-motion behavior and manual specials carousel.

## Respect local content

The menu already supports English/Nepali content and NPR prices. Preserve original restaurant text, Nepali glyph shaping, readable line height, long names, and mixed-script wrapping. Reuse `formatPrice` from `src/lib/menu/presentation.ts` and the minor-unit money model; do not introduce floating-point price calculations or replace its formatting incidentally.

Test existing Nepali search support when touching filters. Apply language metadata to content when its language is known. Do not infer the site's language, currency, or translation requirements from the developer's timezone, and do not introduce a translation framework without a localization request.

When fixing UI, keep the patch scoped and reuse existing hooks, validation, caching, and presentation helpers. Verify keyboard behavior and changed states in the browser using `$interactive-browser-verification` when available. Report concrete fixes and any unresolved accessibility barriers; distinguish observed behavior from assumptions and do not claim formal conformance from a visual review.
