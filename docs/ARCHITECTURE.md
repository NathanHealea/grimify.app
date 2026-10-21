# Architecture

Answers: where does everything go, how does it communicate, and why this way?

> Anything marked **TBD** is undecided. Ask; don't guess.

## 1. System Overview

grimify.app is a static marketing site. Astro builds HTML, CSS and static files into `dist/` at build time. Cloudflare serves `dist/` from an assets-only Worker named `grimify-marketing`. There is no server code, database, authentication or API. The only thing the site connects to is the app, by plain links to https://my.grimify.app/. The app (`../my.grimify.app`) is a separate repo and deployment.

## 2. Architecture Pattern

- **Pattern:** Static site, pre-rendered at build time.
- **Reason:** The site is content that changes only when the code changes. It needs no per-request logic, so static output is the cheapest, fastest and smallest attack surface. It also matches the free-tier constraint (PRD §10).

## 3. Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Astro 7.x, `output: "static"` (the default), `.astro` components, no UI framework | Decided 2026-10-19 (scaffold plan). Ships zero JavaScript by default. **TBD:** reason Astro was chosen over plain HTML or the app's Vite + React stack |
| Styling | Plain CSS files in `src/styles/`, tokens copied from the app | Matches the app's convention (DESIGN_SYSTEM.md) |
| Backend | None | Static site |
| Database | None | No persistent data |
| Authentication | None | No accounts on this site; sign-in happens in the app |
| Storage | None | |
| Hosting | Cloudflare Workers static assets, one assets-only Worker (`grimify-marketing`), no adapter | Same platform as the app; free tier. A static Astro site needs no Cloudflare adapter ([Astro docs](https://docs.astro.build/en/guides/deploy/cloudflare/)) |
| Email | None | No forms (PRD §7) |
| Analytics | **TBD:** none, or cookieless (e.g. Cloudflare Web Analytics) | PRD §13 |
| Other services | None | |
| Runtime (build) | Node 24 (`.nvmrc`) | Matches the app; Astro 7.4.1 requires Node `>=22.22.0` (scaffold plan) |

## 4. System Components

### Pages (`src/pages/`)

- **Responsibilities:**
  - `index.astro`: the landing page (PRD Feature 1).
  - `faq.astro`: the FAQ (PRD Feature 2).
  - `404.astro`: the not-found page (PRD Feature 3). Astro builds it to `dist/404.html`.

### Layout (`src/layouts/`)

- **Responsibilities:**
  - `base.astro`: the `<html lang="en">`, `<head>`, header, skip link, `<main>`, and footer shared by every page.
  - Takes the page title and meta description as props.

### Components (`src/components/`)

- **Responsibilities:**
  - Reusable pieces such as the header, footer and call-to-action link, once a second page needs them.
  - **TBD:** whether components exist at first or the layout holds everything until a second use appears.

### Static files (`public/`)

- **Responsibilities:**
  - `_headers`: security headers (SECURITY.md §6).
  - `robots.txt`: disallows all crawling until launch.
  - Favicon and images, once they exist.

### Worker config (`wrangler.json`)

- **Responsibilities:**
  - An assets-only Worker named `grimify-marketing`, serving `./dist`, with no `main` and no `routes`.
  - Serves `404.html` with HTTP 404 for unknown paths, via `assets.not_found_handling: "404-page"` ([Cloudflare docs](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/), verified 2026-10-20). The scaffold plan's T7 asserts the Worker's top-level keys; this setting lives inside `assets`.

## 5. Architecture Diagram

```text
Visitor's browser
 ↓  HTTPS GET
Cloudflare edge: assets-only Worker "grimify-marketing"
 ↓  serves file from
dist/  (HTML, CSS, robots.txt, _headers applied to responses)

Visitor follows "Open Grimify"
 ↓
my.grimify.app  (separate repo, separate Worker)
```

## 6. Data Flow

1. At build time, `astro build` renders `src/pages/*.astro` with `src/layouts/` and `src/styles/` into `dist/`. Files in `public/` are copied as-is.
2. `wrangler deploy` uploads `dist/` as the Worker's static assets.
3. At request time, Cloudflare serves the matching file and applies the headers from `_headers`. An unknown path gets `404.html` with HTTP 404.
4. A visitor who follows "Open Grimify" leaves this site for my.grimify.app. Nothing is passed along: no query string, cookie or token.

## 7. Project Structure

```text
.
├── astro.config.mjs        site: "https://grimify.app"
├── package.json            scripts: dev, build, check, deploy
├── tsconfig.json
├── wrangler.json           assets-only Worker
├── .nvmrc                  24
├── public/
│   ├── _headers
│   └── robots.txt
├── src/
│   ├── layouts/base.astro
│   ├── components/         (when a second page needs a piece)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── faq.astro
│   │   └── 404.astro
│   └── styles/
│       ├── tokens.css      copied from the app; the only file with raw values
│       ├── global.css      reset, base elements, focus styles
│       └── <page>.css      one per page or component
├── tests/                  Vitest
└── docs/
    └── implementation-plans/
```

This is the layout from the scaffold plan (`docs/implementation-plans/task-site-scaffold.md`), plus `faq.astro`, `404.astro`, `tokens.css` and `components/` from this documentation.

## 8. Dependency Rules

- No server code: no adapter, no `_worker.js`, and no `output: "server"` or on-demand rendered routes.
- No client-side JavaScript unless a work item justifies it, and never for content or navigation. Every page works with JavaScript off.
- No third-party origins at runtime: no CDN fonts, scripts, images or embeds. The CSP forbids them (SECURITY.md §6).
- Raw color, size and spacing values live only in `src/styles/tokens.css`.
- Styles live in `.css` files, never in inline `style` attributes.
- Nothing in this repo imports from `../my.grimify.app` or `../old.grimify.app`. Shared values, such as tokens, are copied.
- Every new dependency needs the owner's approval.

## 9. Key Technical Decisions

The decisions recorded so far (the scaffold plan and this documentation; a DECISIONS.md wasn't created at this tier):

- grimify.app becomes a marketing site; the app moves to my.grimify.app (2026-10-19).
- Astro, static output only, no adapter (2026-10-19).
- Cloudflare Workers static assets, Worker name `grimify-marketing` (proposed in the scaffold plan).
- Plain CSS, with tokens copied from the app (this documentation).
- No forms, accounts, or personal data on this site (PRD §7).

## 10. Performance Considerations

- No web fonts: the system font stack only.
- Zero client JavaScript by default.
- **TBD:** a performance budget, such as a page-weight limit or a Lighthouse performance score. None is set.
- Images, once added, need explicit width and height to avoid layout shift. **TBD:** whether to use Astro's image optimization.

## 11. Scalability Considerations

- Static files at the Cloudflare edge; traffic scale isn't a design concern within the free tier. **TBD:** the free tier's request limits for static assets haven't been checked against expected traffic. No traffic estimate exists.

## 12. Failure Scenarios

| What fails | Expected behavior |
|---|---|
| Unknown path | `404.html` served with HTTP 404 |
| my.grimify.app is down | The link still works; the browser shows its own error. The marketing site can't detect it |
| Cloudflare outage | Site unavailable; nothing to fail over to (accepted at this scale) |
| Build fails | `npm run deploy` stops before `wrangler deploy`; the previous version stays live |
| Bad deploy | Roll back to the previous Worker version. **TBD:** rollback steps (`wrangler rollback` or redeploy a prior commit) |

## 13. Open Questions

- **TBD:** The reason Astro was chosen (record for DECISIONS if one is ever created).
- **TBD:** Analytics: none, or cookieless (PRD §13).
- **TBD:** Exact dependency versions to pin (scaffold plan open item).
- **TBD:** HTML parser for build-output tests (scaffold plan open item; a new dependency needs approval).
- **TBD:** Performance budget, and Astro image optimization (§10).
- **TBD:** Rollback procedure (§12).
- **TBD:** When the cutover adds the `grimify.app` and `www.grimify.app` routes. That's a separate work item, blocked on my.grimify.app's production deploy.
