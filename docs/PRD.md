# Product Requirements Document

Answers: what are we building, for whom, and why?

> Anything marked **TBD** is undecided. Ask; don't guess.

## 1. Product Overview

- **Product name:** Grimify marketing site (grimify.app). The product it markets is the Grimify app at my.grimify.app (repo `NathanHealea/my.grimify.app`).
- **One-line description:** A static website that tells miniature painters what Grimify does and sends them to the app.
- **Product type:** Marketing website.
- **Primary platform:** Web. Static pages, no server rendering, no accounts.

## 2. Problem

- **The problem:** Grimify is moving from grimify.app to my.grimify.app. grimify.app needs to explain the app to people who have never heard of it, so a painter can decide in seconds whether it's worth opening.
- **Why it matters:** The app's audience is miniature painters juggling paints from many brands. They buy duplicates, can't follow tutorials with the paints they own, and lose track of what they want to buy next (see the app's `docs/PRD.md` §2). If the first page they land on is the app itself, they get no context on why to use it.
- **How people solve it today:** Spreadsheets, notes apps, photos of their paint rack, and manufacturer conversion charts that are incomplete or brand-biased.

## 3. Goals

- **Primary goal:** Get a visiting miniature painter to open the app at https://my.grimify.app/.
- **Secondary goals:**
  - Answer the common questions (cost, account, brands, offline) before the visitor has to ask.
  - Meet WCAG 2.1 AA on every page.
  - Cost $0 to host, matching the app.

## 4. Target Users

### Hobby miniature painter

Same audience as the app's PRD §4.

- **Who they are:** Paints tabletop wargaming or board-game miniatures (Warhammer, D&D, and so on). Owns anywhere from 20 to several hundred paints across several brands.
- **Needs:**
  - To understand quickly what Grimify does and whether it's free.
  - To know whether they need an account before trying it.
  - A one-tap path to the app.
- **Pain points:**
  - Buys duplicate paints.
  - Can't substitute paints when a tutorial uses a brand they don't own.
  - Manufacturer conversion charts are hard to use, especially on a phone.

## 5. User Stories

- As a painter, I want to see what Grimify does in one screen so that I can decide whether to try it.
- As a painter, I want to know whether it's free and whether I need an account so that I'm not surprised when I open it.
- As a painter, I want one obvious link to the app so that I can start using it right away.
- As a painter who follows a broken or old link, I want a clear "not found" page that sends me home or to the app.

## 6. Core Features

The site describes four app features. All four exist in the app today (app PRD §6, Features 1, 2, 3 and 6). Use the app's own labels: **Own**, **Want** (Wishlist) and **Favorite**.

- Track paints you own, favorite, or want to buy.
- Search paints across brands.
- Find cross-brand equivalents.
- Build color palettes for projects.

### Feature 1 — Landing page

- **Purpose:** Explain Grimify and send the visitor to the app.
- **User flow:** Visitor lands → reads the headline and feature sections → selects "Open Grimify" → arrives at https://my.grimify.app/. Full flow in UX_FLOWS.md.
- **Inputs:** None. Static content.
- **Outputs:** A page with a headline, the four app features above, and a primary call to action linking to https://my.grimify.app/.
- **Acceptance criteria:**
  - The page has one `<h1>`, a non-empty `<title>` and a meta description, and a link to `https://my.grimify.app/` whose visible text names the app.
  - Each feature it describes exists in the app's current PRD; nothing claims a feature the app doesn't have.
- **Edge cases:**
  - A visitor with JavaScript disabled sees the whole page and can follow the link.
  - A visitor at 320 CSS px wide sees no horizontal scroll.

### Feature 2 — FAQ

- **Purpose:** Answer the questions a painter has before trying the app.
- **User flow:** Visitor opens the FAQ from the landing page or navigation → reads answers → follows the link to the app.
- **Inputs:** None. Static content.
- **Outputs:** A page of questions and answers, with a link to the app.
- **Acceptance criteria:**
  - Each answer matches the app's current behavior. For example, browsing the catalog needs no account, while tracking paints and palettes need sign-in (app PRD §6 Features 3 and 6).
- **Edge cases:**
  - An answer goes stale when the app changes. **TBD:** who checks FAQ answers against the app, and when (e.g. on each app release).
- **TBD:** the list of questions. Candidates: is it free; do I need an account; which brands are included; does it work offline; can I install it on my phone.

### Feature 3 — 404 page

- **Purpose:** Catch unknown paths and send the visitor somewhere useful.
- **User flow:** Visitor requests a path that doesn't exist → sees a "not found" page → follows a link to the home page or the app.
- **Inputs:** Any unknown URL.
- **Outputs:** A 404 response with a page linking to `/` and to https://my.grimify.app/.
- **Acceptance criteria:**
  - An unknown path returns HTTP 404 (not 200) and renders the not-found page.
- **Edge cases:**
  - Old app URLs (e.g. `/paints`, `/palettes/*`) are handled by redirects in the cutover work item, not by this page.

### Feature 4 — Search and social metadata (SEO)

- **Purpose:** Help painters find the site through search engines, and make shared links preview well in chat apps and social posts.
- **User flow:** A painter searches for something like "Citadel Vallejo equivalent" or follows a shared link → sees a clear title, description and preview image → lands on the right page. Covered by UX_FLOWS Flow 1's entry points.
- **Inputs:** Per-page title, description and canonical path, set in each page's frontmatter. One site-wide Open Graph image, plus an optional override per page.
- **Outputs:**
  - Every page's `<head>` has a unique `<title>`, a meta description, `<link rel="canonical">` on `https://grimify.app`, and Open Graph and Twitter card tags.
  - A sitemap of the public pages.
  - JSON-LD structured data.
- **Acceptance criteria:**
  - Every indexable page has a unique `<title>` and meta description.
  - Every page has a canonical URL: absolute, on `https://grimify.app`, and matching the URL the page is served at.
  - Every page has `og:title`, `og:description`, `og:url`, `og:image` (an absolute URL), `og:type` and `twitter:card`.
  - The sitemap lists the landing page and the FAQ, not the 404 page. `robots.txt` names the sitemap.
  - The landing page has JSON-LD for `WebSite` (site name) and `WebApplication` (the app at my.grimify.app, free). The JSON parses, and it claims nothing the app doesn't do.
  - The 404 page has `<meta name="robots" content="noindex">` and no canonical.
- **Edge cases:**
  - **Before launch,** `robots.txt` blocks all crawling, so nothing is indexed and the SEO tags are inert. They're still built and tested, so launch is a `robots.txt` change only.
  - **No ratings or reviews exist,** so the `WebApplication` markup won't earn a Google rich result. Google requires `aggregateRating` or `review` ([Google: Software app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app), checked 2026-10-21). Never invent ratings to qualify.
  - **No `FAQPage` markup.** Google deprecated FAQ rich results and stopped showing them from 2026-05-07 ([Google: FAQPage](https://developers.google.com/search/docs/appearance/structured-data/faqpage), checked 2026-10-21).
  - **Shared links on `workers.dev`** before the cutover still point their canonical and `og:url` at grimify.app. That's intended: grimify.app is the real address.

## 7. Non-Goals

Intentionally not part of this version:

- Blog, news or articles.
- Email signup, contact forms, or anything else that collects personal data.
- Translations. The site is English only.
- Accounts, sign-in, or any server-side code on grimify.app.
- Claims about features the app doesn't have yet, or dates for anything unreleased.

## 8. MVP Scope

- **Must have:**
  - Landing page.
  - FAQ page.
  - 404 page.
  - Search and social metadata (Feature 4). The Open Graph image depends on the artwork being ready (DESIGN_SYSTEM §2a).
- **Nice to have:**
  - **TBD:** screenshots or images of the app. (The scaffold plan lists them as later work.)
- **Future:**
  - **TBD:** nothing decided yet.

## 9. Success Metrics

- **Primary:**
  - **TBD:** how success is measured. The candidate metric is the share of visitors who follow "Open Grimify" to the app. It can't be measured until the analytics decision is made (see §13).
- **Secondary:**
  - Hosting cost stays at $0/month.
  - **TBD:** a search metric, such as impressions and clicks for target queries, read from a search-console tool after launch. Which tool, which queries, and what target are undecided. Search consoles are configured outside the site and add nothing to the page, beyond a possible verification file or meta tag.

## 10. Constraints

- **Technical:** Static Astro output only, with no adapter and no server rendering. Plain CSS files. Hosted as an assets-only Cloudflare Worker. Free tier only.
- **Business:** No budget. Built by one person, mostly through AI coding agents.
- **Compliance:** WCAG 2.1 AA on every page. No personal data is collected, so FERPA and personnel-data rules don't apply (see SECURITY.md).
- **Design:** Copy follows the tone rules from the old launch messaging kit (`../old.grimify.app/docs/marketing/02-messaging-kit.md`):
  - Write in the first person ("I built", "I'm a painter who codes").
  - Be specific: named paints and named brands, not abstractions.
  - No hype words ("excited to announce", "game-changing", "revolutionise", "seamless", "powerful").
  - No roadmap promises or dates for unreleased work.
  - Don't push sign-ups. The account is optional for browsing, and saying so is a feature.

  The kit's taglines and numbers (e.g. "2,800+ paints") describe the old app and are **not** reused.
- **Timeline:** **TBD.** The cutover of grimify.app from the app to this site can't happen until my.grimify.app's production deploy is verified (scaffold plan, out of scope).

## 11. Assumptions

- The visitor's next step is the app, not a sign-up. Browsing the app's catalog needs no account (app PRD §11).
- The app is currently a private beta (app PRD §1). Until launch, `robots.txt` disallows all crawling (scaffold plan R5).
- Facts on the site (brand list, paint count, features) come from the app's docs and catalog, never from the old messaging kit.

## 12. Definition of Done

The product or feature is complete when:

- [ ] Requirements are implemented
- [ ] Critical user flows work
- [ ] `npm run check` passes
- [ ] `npm run build` succeeds
- [ ] Security headers from SECURITY.md are present
- [ ] Accessibility requirements (WCAG 2.1 AA) are satisfied and checked
- [ ] Documentation is updated

## 13. Open Questions

- **TBD:** Analytics: none, or cookieless (e.g. Cloudflare Web Analytics)? This blocks §9's success metric. Any analytics changes the CSP in SECURITY.md.
- **TBD:** Success metric and target (§9).
- **TBD:** FAQ question list (Feature 2).
- **TBD:** Who keeps site claims and FAQ answers in sync with the app, and when.
- **TBD:** Screenshots and images (§8).
- **TBD:** Open Graph image artwork (Feature 4; blocked on the logo, app issue #3).
- **TBD:** Target search queries and the search metric (§9).
- **TBD:** Per-page titles and meta descriptions (Feature 4). They follow the copy tone rules in §10.
- **TBD:** Launch timeline, i.e. when crawling is allowed and grimify.app is cut over (§10).
- **TBD:** Primary tagline and headline copy.
- Assumption: the site is English only and collects no personal data. If an email form is ever added, this PRD, SECURITY.md and the CSP all change.
