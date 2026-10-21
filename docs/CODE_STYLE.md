# Code Style and Conventions

Answers: how should code be written so it looks like one person wrote it?

> Anything marked **TBD** is undecided. Ask; don't guess.

**Decision (2026-10-20):** Match the app's tooling fully: Prettier, ESLint and Stylelint, adapted for Astro. The scaffold work item doesn't include them. They arrive in a follow-up work item, which is when the new dev dependencies are approved and pinned. Until then, `npm run check` is `astro check` plus Vitest (scaffold plan R7).

## 1. General Principles

- Prefer readable code
- Keep components focused: one page, one layout, one component per file
- Avoid unnecessary abstractions; extract a component on its second use, not its first
- Reuse existing components and styles
- Prefer consistency with the app (`../my.grimify.app/docs/CODE_STYLE.md`) over novelty

## 2. Naming

| Thing | Convention | Example |
|---|---|---|
| Astro components and layouts | kebab-case file name | `src/layouts/base.astro`, `src/components/site-header.astro` |
| Pages | kebab-case file name; it becomes the URL | `src/pages/faq.astro` → `/faq/` |
| CSS files | Same name as the page or component they style | `site-header.astro` + `site-header.css` |
| CSS classes | kebab-case, optional BEM `__element`, as in the app | `.site-header__nav` |
| CSS variants | `data-*` attributes, as in the app | `data-variant="secondary"` |
| Design tokens | The app's names, unchanged | `--color-primary`, `--space-4` |
| Props and variables (TS in frontmatter) | camelCase | `pageTitle` |
| Constants | camelCase, or UPPER_SNAKE for true module constants | `APP_URL` |
| Tests | `<subject>.test.ts`; E2E `<flow>.spec.ts` | `tests/build-output.test.ts` |

The scaffold plan names files `base.astro`, `global.css` and `home.css`; this table agrees with it.

**TBD:** whether the app URL `https://my.grimify.app/` lives in one constant (e.g. `src/config.ts`) or is written in each link. One constant is recommended, since every page links to it at least three times.

## 3. Folder Structure

See ARCHITECTURE.md §7.

- A new page goes in `src/pages/`.
- A piece shared by two or more pages goes in `src/components/`.
- Styles go in `src/styles/`. Raw values (hex, px sizes) live only in `tokens.css`.
- Static files served as-is (headers, robots, favicon, images) go in `public/`.
- Tests go in `tests/`, and E2E specs in `tests/e2e/`.

## 3a. Styling

Follow the app's rules (its CODE_STYLE §5a), adapted for Astro:

- **No inline `style` attributes.** Test T4 enforces this on the built HTML.
- **No `<style>` blocks inside `.astro` files.** Styles live in `.css` files, imported in the component's frontmatter. This keeps the app's "one `.css` per component" rule and keeps the CSP free of `unsafe-inline` for styles.
  - **TBD:** check that Astro doesn't inline small CSS files into `<style>` tags (its `build.inlineStylesheets` option) in a way that breaks the CSP. Pick the setting in the scaffold.
- **No CSS framework,** no Tailwind, no CSS-in-JS.
- **Use tokens only:** `var(--color-text)`, never `#0a0a0a`, outside `tokens.css`.

## 4. Imports

- Order: external packages → internal aliases → relative imports. The app enforces this with `eslint-plugin-simple-import-sort`; use the same.
- **TBD:** whether to use a path alias (the app uses `@/`). Astro supports one through `tsconfig.json` `paths`.
- Never import from `../my.grimify.app` or `../old.grimify.app`; copy instead (ARCHITECTURE.md §8).

## 5. Error Handling

- **Use:** Let the build fail loudly. A missing prop, a bad import or a type error must stop `astro build` / `astro check`, never produce a half-rendered page.
- **Do not:** Swallow errors with a catch-all; render a page with fallback text that hides a missing value.

There's no runtime code, so there's no runtime error handling. The 404 page is the only error the visitor sees.

## 6. Comments

Comments explain why something exists, a tradeoff, or non-obvious behavior. They never restate the code. Name the spec or ticket when working around one: for example, a WCAG success criterion behind a contrast choice.

## 7. Logging

- **Library:** None. No runtime code; no `console.log` left in committed code.
- **Rules:** Follow SECURITY.md §9.

## 8. Tooling

| Purpose | Tool | Command |
|---|---|---|
| Formatter | Prettier, `printWidth: 100` (as in the app), with `prettier-plugin-astro` | `npm run format` |
| Linter (code) | ESLint with `eslint-plugin-astro`, `typescript-eslint`, `eslint-plugin-simple-import-sort` | `npm run lint` |
| Linter (CSS) | Stylelint, `stylelint-config-standard`. Rejects hex colors, named colors, color functions and `px` lengths outside `tokens.css` (`px` allowed in media queries), as in the app | `npm run lint` |
| Type checker | `astro check` (with `@astrojs/check` and TypeScript) | `npm run check` |

`npm run lint` will be `eslint . && stylelint "src/**/*.css"`, as in the app. `npm run check` will run lint, `astro check` and Vitest.

**TBD:**
- Exact versions of each tool, pinned as in the app.
- Whether the app's ESLint config carries over or is rewritten. Most of its rules target React, TanStack Router and Convex, which this repo doesn't use.
- The tsconfig base: Astro's `strict` or `strictest`.

## 9. Do

- Reuse existing patterns, and the app's where they apply
- Keep changes focused
- Follow project conventions
- Remove dead code
- Write links and buttons as real `<a>` and `<button>` elements

## 10. Don't

- Create duplicate components or styles
- Add a dependency without approval
- Add client-side JavaScript without a work item that justifies it. JSON-LD `application/ld+json` blocks aren't JavaScript and are allowed (ARCHITECTURE §8)
- Hand-type a canonical or `og:url`. Build them from `Astro.site` and the page path
- Add server code, an adapter, or on-demand rendering
- Load anything from a third-party origin
- Ignore the documented architecture
- Change unrelated files

## 11. Open Questions

- **TBD:** Tool versions; how much of the app's ESLint config carries over; tsconfig strictness (§8).
- **TBD:** One constant for the app URL (§2).
- **TBD:** Path alias (§4).
- **TBD:** Astro `build.inlineStylesheets` setting versus the CSP (§3a).
- **TBD:** The follow-up work item that adds Prettier, ESLint and Stylelint. Not yet planned.
