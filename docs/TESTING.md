# Testing

Answers: how will we know it works? "The code looks correct" is not a test result.

> Anything marked **TBD** is undecided. Ask; don't guess.

## 1. Critical Functionality

- Every page builds to static HTML with no server code (scaffold plan R1).
- The "Open Grimify" link reaches https://my.grimify.app/ from every page.
- An unknown path returns HTTP 404 with the not-found page.
- Every page meets WCAG 2.1 AA in light and dark mode.
- Security headers are present and the CSP allows no inline script, `eval` or third-party origin.
- `robots.txt` blocks crawling until launch.

## 2. Test Levels

| Level | Covers | Tool |
|---|---|---|
| Unit / static | Config files (`_headers`, `robots.txt`, `wrangler.json`, `package.json` scripts) and the built HTML in `dist/` | Vitest, `// @vitest-environment node` (scaffold plan) |
| Integration | Not applicable: no API, database or auth | — |
| End-to-end | The three flows in UX_FLOWS.md against the built site, served locally | Playwright, matching the app (decided 2026-10-20). Arrives in a later work item |
| Accessibility (automated) | axe-core scan of every page in light and dark mode; 320 CSS px reflow check | `@axe-core/playwright` (decided 2026-10-20). Same later work item |
| Accessibility (manual) | Keyboard-only pass and a screen-reader pass of each flow; Lighthouse accessibility audit on the deployed page | Browser, a screen reader, Lighthouse |
| Deployed headers | Real response headers on the deployed Worker | `curl -sI` (scaffold plan AC4) |

Automated checks can't prove WCAG 2.1 AA on their own. The manual pass is required for each page before it ships, and its results are recorded in the work item's progress log.

**TBD:** the screen reader(s) for the manual pass. VoiceOver on iOS/macOS and NVDA on Windows are the usual pair; the app's audience is mobile-first.

## 3. Test File Structure

```text
tests/
├── build-output.test.ts    built HTML in dist/ (scaffold T1–T4)
├── static-files.test.ts    _headers, robots.txt, wrangler.json, package.json (scaffold T5–T8)
└── e2e/
    ├── landing.spec.ts     Flow 1 + axe scan
    ├── faq.spec.ts         Flow 2 + axe scan
    └── not-found.spec.ts   Flow 3 + axe scan
```

The `e2e/` file names are proposed. The scaffold plan fixes the two Vitest files.

## 4. Critical User Flows

### Flow 1: Learn about Grimify and open the app

- **Steps:**
  1. Load `/`.
  2. Tab from the top of the page. The skip link is first and moves focus to `<main>`.
  3. Tab to "Open Grimify" in the header, hero and footer.
- **Expected result:**
  - Each link has `href="https://my.grimify.app/"` and a visible focus ring.
  - Exactly one `<h1>`.
  - No axe violations in light or dark mode.
  - No horizontal scroll at 320px.

### Flow 2: Get questions answered

- **Steps:**
  1. From `/`, activate "FAQ" in the header.
  2. Navigate the questions by heading.
- **Expected result:**
  - The FAQ page loads, and its header link has `aria-current="page"`.
  - Each question is a heading.
  - The page links to the app.
  - No axe violations.

### Flow 3: Unknown path

- **Steps:**
  1. Request `/does-not-exist`.
- **Expected result:**
  - HTTP 404.
  - The title and `<h1>` say the page wasn't found.
  - The page links to `/` and to the app.
  - No axe violations.

**TBD:** how the E2E run serves the site. `astro preview` doesn't apply Cloudflare's `_headers` or `not_found_handling`, so Flow 3's status code and the header checks need `wrangler dev` or the deployed Worker.

## 5. Test Data

None. The site has no data. Tests read built files and the repo's own config. Screenshots used in tests or docs show only the app with synthetic or the owner's own data, never other people's collections.

## 6. Coverage

- **Target:** No line-coverage target; there's almost no executable code. Instead, every scaffold requirement and every UX flow has a test, or a recorded manual check.
- **Prioritize:** accessibility, the app link, the 404 status, and security headers.

## 7. Commands

| Purpose | Command |
|---|---|
| Test (unit/static) | `npm run check` (runs `astro check` and `vitest run`; scaffold plan R7) |
| Test (E2E + a11y) | `npm run test:e2e` (Playwright, as in the app). **TBD:** whether it joins `check` or stays separate, as in the app |
| Lint | `npm run lint` (ESLint + Stylelint; arrives with the tooling work item, then joins `check`) |
| Type check | `npm run check` (`astro check`) |
| Build | `npm run build` |

Verify commands for the wi workflow (from CLAUDE.md): `npm run check` and `npm run build`.

**TBD:** whether `check` builds first, or the `dist/` tests skip when `dist/` is missing. The scaffold plan decides this in its step 2. Until then, T1–T4 can pass against a stale `dist/`.

## 8. Definition of Done

- [ ] `npm run check` passes
- [ ] `npm run build` passes
- [ ] Lint passes (once the tooling work item lands)
- [ ] E2E flows pass (once Playwright lands)
- [ ] axe scan clean in light and dark mode (once Playwright lands)
- [ ] Manual keyboard, screen-reader and 320px checks done and recorded in the work item's progress log

## 9. Open Questions

- **TBD:** Screen reader(s) for the manual pass (§2).
- **TBD:** How E2E serves the site so `_headers` and 404 handling are real (§4).
- **TBD:** Whether `test:e2e` is part of `check` (§7).
- **TBD:** Whether `check` builds before the `dist/` tests (§7; the scaffold plan decides).
- **TBD:** The work item that adds Playwright and `@axe-core/playwright`. New dev dependencies, not yet planned.
