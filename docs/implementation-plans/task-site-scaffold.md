---
type: task
slug: site-scaffold
status: planned      # planned | in-progress | changes-requested | staged | released
branch: task/site-scaffold
worktree_path:       # set by `wi start`
created: 2026-10-19
approved:            # set by `wi approve`
commit_type:         # optional override for the merge commit type (default: story=feat, bug=fix, task=chore)
version:             # set by `wi stage`
review_approved:     # set by `wi accept`
pr:                  # set by `wi pr`
tag:                 # set by `wi release`; the tag sits on the merge commit
---

# Scaffold the Astro marketing site and deploy it

## Summary

Sets up grimify.app's marketing site as a static Astro project, with one placeholder home page pointing visitors to the app at my.grimify.app. It deploys to Cloudflare as an assets-only Worker on its `workers.dev` address. This gives later work items a working build, checks and deploy path to build on. It doesn't touch the grimify.app domain; that moves in a separate cutover item, after the app is live on my.grimify.app.

## Context

The owner decided on 2026-10-19:
- the app moves from grimify.app to my.grimify.app (`../my.grimify.app`, work item `hosting/task-app-subdomain`);
- the old Supabase app moves to `../old.grimify.app`;
- grimify.app becomes a marketing site in this repo, built with Astro.

The repo is empty: no commits on `main` and nothing on GitHub (`NathanHealea/grimify.app`). The only file is `CLAUDE.md`.

Facts this plan relies on:
- **Astro 7.4.1 is the current release** (`npm view astro`, 2026-10-19). It requires Node `>=22.22.0`; `../my.grimify.app` uses Node 24 (`.nvmrc`).
- **A static Astro site needs no Cloudflare adapter** ([Astro: Deploy to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)). The adapter is only for on-demand rendering. Wrangler config is `name`, `compatibility_date` and `assets.directory: "./dist"`, with no `main`. The deploy command is `npx astro build && npx wrangler deploy`.
- **The app's conventions are worth copying:** Wrangler pinned as a dev dependency, used with `npx --no`; `public/_headers` for security headers; plain CSS. See `../my.grimify.app/docs/features/hosting.md`.

Messaging for the eventual page exists in `../old.grimify.app/docs/marketing/02-messaging-kit.md`. It isn't used here beyond a one-line description.

## Scope

**In scope**

- Astro project with static output only:
  - `package.json` with `dev`, `build`, `check` and `deploy` scripts;
  - `.nvmrc` (24);
  - `astro.config.mjs` with `site: "https://grimify.app"`;
  - `tsconfig.json`;
  - `.gitignore`.
- **One page, `src/pages/index.astro`:** a heading, a one-sentence description and an "Open Grimify" link to https://my.grimify.app/. Plus one layout (`src/layouts/base.astro`) with `lang="en"`, a title, a meta description and a viewport meta tag. Styles live in `src/styles/*.css`, not inline.
- **`public/_headers`:** a strict CSP (Content-Security-Policy, the header that limits where a page may load scripts and other resources from), `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`. **`public/robots.txt`** disallows all crawling until launch.
- **`wrangler.json`:** an assets-only Worker named `grimify-marketing`, with no routes, so it serves only on `workers.dev`.
- **Vitest tests** for the config and the built output.
- **README:** none, unless asked.

**Out of scope**

- **The grimify.app cutover**, a separate work item. It needs:
  - custom-domain routes for `grimify.app` and `www.grimify.app`;
  - the self-unregistering `sw.js`;
  - redirects for app paths such as `/paints` and `/palettes/*` to my.grimify.app.

  It can't happen until `my.grimify.app`'s production deploy is verified.
- **Real marketing content:** copy, images, screenshots, OG images, analytics.
- **Dev and stage environments, and a deploy script with branch checks.** There's one environment for now.
- **CI.**

## Requirements

- **R1** — `npm run build` produces a static site in `dist/` with no server code: no `_worker.js` and no adapter output.
- **R2** — `dist/index.html` has `lang="en"`, a non-empty `<title>`, a meta description, exactly one `<h1>`, and a link to `https://my.grimify.app/` whose visible text names the app.
- **R3** — Every page meets WCAG 2.1 AA:
  - text contrast is at least 4.5:1;
  - the link has a visible focus indicator;
  - the page reflows at 320 CSS px with no horizontal scroll;
  - it works with the keyboard alone.
- **R4** — Responses carry the CSP, `nosniff`, `Referrer-Policy` and `Permissions-Policy` from `public/_headers`. The CSP allows no inline script, no `eval` and no third-party origin.
- **R5** — `robots.txt` disallows all crawlers.
- **R6** — `wrangler.json` deploys an assets-only Worker named `grimify-marketing` from `./dist`, with no `main` and no `routes`.
- **R7** — `npm run check` runs `astro check` (type and template errors) and the Vitest suite, and fails if either fails.

## Acceptance criteria

- **AC1** (R1) — Given a clean checkout, when I run `npm ci && npm run build`, then `dist/index.html` exists and `dist/` holds no `_worker.js`.
- **AC2** (R2) — Given the built page, when I open it, then I see the heading, the description and an "Open Grimify" link to https://my.grimify.app/.
- **AC3** (R3) — Given the deployed page, when I tab to the link, then focus is visible. Lighthouse's accessibility audit reports no contrast or name failures. At 320 px wide, nothing scrolls sideways.
- **AC4** (R4) — Given the deployed Worker, when I run `curl -sI https://grimify-marketing.<account>.workers.dev/`, then all four headers are present.
- **AC5** (R6) — Given `npm run deploy`, when it finishes, then the site is live on its `workers.dev` address, and grimify.app still serves the app.

## Test plan

Vitest with `// @vitest-environment node`, in `tests/`. The `dist/` tests run after `npm run build`: `check` builds first, or the tests skip with a clear message if `dist/` is missing. Decide which in step 2 and record it here.

| ID | Covers | Test | File | Asserts |
|----|--------|------|------|---------|
| T1 | R1 | `builds a static site with no server code` | `tests/build-output.test.ts` | `dist/index.html` exists; no `dist/_worker.js` or `dist/_worker.js/` |
| T2 | R2 | `home page has a language, title, description and one h1` | `tests/build-output.test.ts` | parsed `dist/index.html`: `html[lang=en]`, non-empty `title`, `meta[name=description]` with content, exactly one `h1` |
| T3 | R2 | `home page links to the app by name` | `tests/build-output.test.ts` | an `a[href="https://my.grimify.app/"]` whose text contains "Grimify" |
| T4 | R3 | `pages carry no inline style attributes` | `tests/build-output.test.ts` | no element in `dist/**/*.html` has a `style` attribute; styling comes from CSS files |
| T5 | R4 | `security headers allow no inline script, eval or third party` | `tests/static-files.test.ts` | `public/_headers` applies to `/*`; the CSP has `default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`; no `unsafe-eval`, no `unsafe-inline` in `script-src`, no `*`, no `http:`/`https:` origins; the other three headers present |
| T6 | R5 | `robots.txt disallows everything` | `tests/static-files.test.ts` | `User-agent: *` and `Disallow: /` |
| T7 | R6 | `wrangler.json deploys assets only, with no routes` | `tests/static-files.test.ts` | keys are exactly `name`, `compatibility_date`, `assets`; `name` is `grimify-marketing`; `assets.directory` is `./dist`; no `main`, no `routes` |
| T8 | R7 | `check runs astro check and the tests` | `tests/static-files.test.ts` | `package.json` `scripts.check` runs `astro check` and `vitest run` |

**Not unit testable:** R3's contrast, focus, reflow and keyboard checks need a browser. Verify on the deployed page with Lighthouse (accessibility), a 320 px viewport and keyboard-only navigation, and record the results in the progress log. R4's real response headers are verified by AC4's `curl`.

## Implementation plan

1. [ ] Initial commit on `main` with `CLAUDE.md` and this document, so `wi start` has a base branch — touches `CLAUDE.md`, `docs/implementation-plans/task-site-scaffold.md` — tests none (repo setup)
2. [ ] Scaffold Astro with static output. Add pinned dev dependencies: `astro`, `@astrojs/check`, `typescript`, `vitest`, `wrangler`, and an HTML parser for T2–T4 if Node has none. Add `package.json` scripts, `.nvmrc`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, and a minimal `src/pages/index.astro` — touches `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore` — tests T1, T8
3. [ ] Base layout, home page and CSS: tokens with AA contrast, a visible focus style, and a reflowing layout — touches `src/layouts/base.astro`, `src/pages/index.astro`, `src/styles/global.css`, `src/styles/home.css`, `tests/build-output.test.ts` — tests T2, T3, T4
4. [ ] Security headers and robots.txt — touches `public/_headers`, `public/robots.txt`, `tests/static-files.test.ts` — tests T5, T6
5. [ ] `wrangler.json` and the `deploy` script (`astro build && wrangler deploy` via `npx --no`). Then the first deploy to `workers.dev` and the manual accessibility checks — touches `wrangler.json`, `package.json`, `tests/static-files.test.ts` — tests T7

**Must not change:**
- **The grimify.app domain:** no routes in this item.
- **Anything in `../my.grimify.app` or `../old.grimify.app`.**

**High-risk steps:**
- **Step 1:** the repo's first commit. Once it's pushed it can't be rewritten, and per your rules it needs your go-ahead.
- **Step 5's first deploy:** it creates a new Worker in your Cloudflare account. It touches no domains, so it's undone by deleting the Worker.

## Risks and open questions

- **Open: which dependency versions to pin.** The plan pins exact versions. Astro 7.4.1 was published on 2026-10-19, today. Pin it, or the previous patch?
- **Open: an HTML parser for T2–T4.** Adding a parser such as `node-html-parser` or `parse5` is a new dev dependency and needs your OK. The alternative is regex over the built HTML, which is fragile.
- **Proposed: Worker name `grimify-marketing`.** It shows in the Cloudflare dashboard and the `workers.dev` URL. The app's Workers are `v2-grimify-app*`.
- **Proposed: deploy straight to production `workers.dev`** with no branch checks, unlike the app. It's one placeholder page with nothing secret. Add the app-style checks when the cutover item attaches grimify.app.
- **Risk: where `dist/` tests run.** If `check` doesn't build first, T1–T4 can pass against a stale `dist/`. Step 2 decides and updates this document.
- **Risk: the cutover is a separate item.** Until it ships, grimify.app keeps serving the app, and old installed apps keep working. The cutover depends on `my.grimify.app`'s `task-app-subdomain` reaching production.

## Progress log

- 2026-10-19 — Planned.
