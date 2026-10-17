---
name: design-system-extraction
description: Extract and reuse qrmenu design tokens, visual patterns, and component boundaries before adding or restyling UI. Use for design consistency or adapting a supplied visual reference.
---

# Design system extraction

Work from the project root. Read `AGENTS.md` and the relevant installed guides under `node_modules/next/dist/docs/` before implementation.

## Establish the visual source

Read `docs/MENU-DESIGN.md`, `src/app/globals.css`, and the components used by the affected route. Inspect `src/components/menu/` for the guest menu, `src/components/editor/` for owner editing, and the existing auth/form components for account flows. Read `src/lib/menu/presentation.ts` for prices, images, and accessible accents.

Treat an explicitly supplied design reference as the intended direction. Otherwise retain the existing warm ivory/stone palette, orange accents, typography hierarchy, subtle borders, and restrained shadows. Distinguish values observed in code from values inferred from a screenshot; do not present inferred values as exact measurements.

Before editing, produce a compact inventory of the affected area's semantic colors, font sizes/weights/line heights, spacing, content widths, breakpoints, radii, shadows, image proportions, and interaction states. Cite the existing files or selectors that establish them. Include default, hover, focus, selected, disabled, loading, empty, and error states when applicable.

## Apply the system

- Reuse existing components and utilities first. Extract a shared primitive when repeated behavior or styling makes it useful; keep route-specific composition in the route's components.
- Give new tokens semantic roles and use the existing Tailwind/CSS approach. Avoid parallel theme systems, speculative component libraries, and a growing set of nearly identical arbitrary values.
- Preserve the documented phone two-column and wider-screen three-column guest menu unless the user requests a layout change. Keep diet text alongside colors, manual specials navigation, and readable prices. Preserve the menu's current product scope.
- Keep domain calculations in `src/lib/`, interaction/data hooks in `src/hooks/`, and rendering in components. Follow `docs/CACHING.md` for data freshness and invalidation; styling work should not create new fetch paths.
- Keep client boundaries narrow. Reuse the deferred search and memoized index in `src/hooks/use-public-menu.ts`. Apply debouncing, memoization, or stable callbacks where they prevent identified work or support an existing consumer contract; consider the enabled React Compiler when choosing optimizations.

For an extraction-only request, return the inventory and reuse recommendations without modifying application UI. When implementing, report the components/tokens reused or introduced and verify the affected screens using `$interactive-browser-verification` when available.
