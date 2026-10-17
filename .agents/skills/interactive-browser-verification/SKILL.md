---
name: interactive-browser-verification
description: Verify qrmenu UI changes in a real browser with responsive screenshots, user interactions, keyboard checks, and runtime evidence. Use after changes to rendered layout or behavior.
---

# Interactive browser verification

Work from the project root. Read `AGENTS.md`, `package.json`, and the relevant existing browser scripts before selecting a check. Skills provide instructions; they do not install or grant access to a browser.

## Use existing verification

- `npm run check:editor-browser` runs `scripts/check-public-menu.mjs --browser`, which builds the production app against isolated in-memory PostgreSQL and stub auth, starts it on port 3148, and calls `checkEditorBrowser` from `scripts/check-editor-browser.mjs`. The browser helper is exported and is not a standalone CLI.
- `npm run check:public-menu` uses the same isolated integration harness without browser interactions. Its successful output alone does not verify the rendered UI.
- The browser helper uses `playwright-core` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, defaulting to installed Chrome on Windows. Check browser availability before running. Reuse an installed compatible browser; if none is available, report the missing prerequisite and distinguish static checks from browser checks.
- Screenshots belong under ignored `artifacts/`. The isolated harness replaces `.next` with a test-environment build; after it finishes, run `npm run build` to restore the normal environment's production build. Avoid competing builds or dev processes against the same `.next` directory.

For a narrow visual check, an existing local server and `/momo-house` example menu may be sufficient. Establish the actual origin and route before navigating; do not assume the example covers authenticated editor behavior. Use synthetic data for editing/publish tests through the isolated harness.

## Exercise the changed experience

Inspect the changed route at a narrow phone width of 320 px, a typical phone width around 390 px, and a desktop width around 1280 px. Confirm page content fits horizontally, intentional category scrolling still works, and sticky elements do not cover focused content. Wait for hydration, fonts, and relevant image decoding before screenshots.

Choose interactions based on the change:

- Guest menu: search by item/category and Nepali text, combine search with category selection, recover from no results, reset filters, navigate specials, and inspect sold-out/variant/diet labels.
- Editor: open and close affected forms, trigger validation, save and observe refreshed data, retry failures, and verify preview. Test publication or tenant switching only when relevant, using the isolated fixtures.
- Shared UI: use Tab/Shift+Tab and native keyboard activation, inspect visible focus and accessible names, and check loading, empty, success, and error states relevant to the change.

Prefer role/label locators and observable states or responses over fixed sleeps. Capture unhandled errors and relevant failed requests; assess whether they belong to the application or a deliberately stubbed service. Close browser contexts and any server started for the check.

Open and visually inspect screenshots; creating files alone does not establish visual quality. Report tested routes, viewport sizes, actions, artifact paths, and any remaining limitations. Do not describe headless emulation as physical-device testing or automated checks as a complete accessibility audit. Run lint/type checks and relevant existing tests when application code changes justify them.
