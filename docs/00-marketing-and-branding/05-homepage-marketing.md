# Homepage Marketing Landing Page

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** In Progress
**Branch:** `v1/feature/homepage-marketing`
**Merge into:** `v1/main`

## Summary

Replace the empty `/` route with a marketing landing page: a hero containing a paint/color search bar that hands off to `/paints`, a features section that visualizes what Grimify offers (color wheel, cross-brand comparison, palettes, collection, recipes), and a call-to-action driving guests to sign up or browse paints. The page is the first surface a new visitor sees — it must communicate the value proposition in under 5 seconds and provide a single obvious action.

## Acceptance Criteria

- [x] `/` renders a marketing landing page (currently empty)
- [ ] Hero contains the Grimify wordmark/logo, a one-line value prop, a sub-headline, and a **paint search input** that submits to `/paints?q={query}` *(intentionally tagline-first — see Risks; navbar already shows the wordmark)*
- [x] Pressing **Enter** in the hero search submits; an explicit submit button is also present
- [x] Hero search uses the existing `SearchInput` component (`src/components/search.tsx`) — no new search input from scratch
- [x] Features section shows **5 feature cards** (Color Wheel, Cross-Brand Search, Color Schemes, Palettes & Collection, Recipes) with icon, title, blurb, and link to the relevant route
- [x] Each feature card is a real link to its destination route (`/wheel`, `/paints`, `/schemes`, `/palettes`, future `/recipes`)
- [x] CTA section adapts to auth state: signed-out users see **"Create an account"** + **"Browse paints"**; signed-in users see **"Open my collection"** + **"Build a palette"**
- [x] Page metadata uses `pageMetadata` and inherits the existing root OpenGraph image
- [x] Layout is responsive — mobile (single column), tablet (2-up cards), desktop (max-w-6xl, 3-up cards)
- [x] Logo, navbar, and footer are unchanged; landing content lives only inside `<main>`
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description                            |
| ----- | -------------------------------------- |
| `/`   | Public marketing landing page (Home)   |

## Key Files

| Action | File                                                               | Description                                                                          |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Modify | `src/app/page.tsx`                                                 | Replace empty body with composed marketing sections; auth state read here, server-side |
| Create | `src/modules/marketing/components/hero.tsx`                        | Hero server component — logo, headline, sub-headline, slot for `<HeroSearch />`       |
| Create | `src/modules/marketing/components/hero-search.tsx`                 | **Client** component — form wrapping `SearchInput`; submits → `router.push('/paints?q=...')` |
| Create | `src/modules/marketing/components/feature-grid.tsx`                | Server component — grid wrapper rendering the 5 `FeatureCard`s from a typed array     |
| Create | `src/modules/marketing/components/feature-card.tsx`                | Server component — single card (icon, title, body, link)                              |
| Create | `src/modules/marketing/components/cta-section.tsx`                 | Server component — auth-aware CTA pair                                                |
| Create | `src/modules/marketing/types/feature.ts`                           | `Feature` type for the feature card definitions                                       |
| Create | `src/modules/marketing/utils/features.ts`                          | Static list of `Feature` records — single source of truth for the grid                |
| Create | `public/marketing/hero.webp`                                       | Hero ambient image (AI-generated — see prompts below)                                 |

## Implementation Plan

The feature is **largely shipped**. The `src/modules/marketing/` module exists and `/` composes the full landing experience. This plan now reflects current code state and the remaining polish work.

### Domain module placement

`src/modules/marketing/` is the target module. Current contents:

```
src/modules/marketing/
├── components/
│   ├── hero.tsx              ✅ server — gradient band, headline, sub-headline, <HeroSearch/> + <BrandStrip/>
│   ├── hero-search.tsx       ✅ client — form wrapping SearchInput, router.push('/paints?q=…')
│   ├── brand-strip.tsx       ✅ server — muted trust strip listing supported brands (added beyond plan)
│   ├── feature-grid.tsx      ✅ server — responsive <ul> grid mapping features[] → <FeatureCard/>
│   ├── feature-card.tsx      ✅ server — clickable <Link> card (icon + title + blurb)
│   ├── stats-strip.tsx       ✅ server — hardcoded social-proof stat row (added beyond plan)
│   ├── cta-section.tsx       ✅ server — auth-aware CTA pair
│   └── not-found-content.tsx ✅ server — 404 body reused by app/not-found.tsx (added beyond plan)
├── types/
│   └── feature.ts            ✅ Feature type, JSDoc complete
└── utils/
    └── features.ts           ✅ static Feature[] (Cross-Brand Search, Brand Browser, Palettes, Recipes, Collection)
```

`src/app/page.tsx` is already a thin server component: reads `supabase.auth.getUser()` and composes `<Hero/>`, `<FeatureGrid/>`, `<StatsStrip/>`, `<CtaSection isAuthenticated={!!user} />`, all wrapped in `<Main>`.

### Already implemented (done)

All of the following are built and live on `main`:

- **Module + types + utils** — `types/feature.ts` and `utils/features.ts` exist with full JSDoc. The feature list ships 5 cards: Cross-Brand Search (`/paints`), Brand Browser (`/brands`), Palettes (`/palettes`), Painting Recipes (`/recipes`), Collection Tracking (`/collection`). (Note: the final card set differs from the original draft — Color Wheel/Schemes were dropped in favor of Brand Browser/Collection; all five linked routes except `/wheel` exist.)
- **Hero** (`hero.tsx`) — tagline-first headline, value-prop sub-headline, `<HeroSearch/>` client island, and a `<BrandStrip/>` trust line. Gradient band (`from-muted/40 to-background`), `max-w-3xl` centered text column, responsive display type.
- **Hero search** (`hero-search.tsx`) — `'use client'`, `useRouter`, `useState`, named `import type { ChangeEvent, SubmitEvent }` from `'react'`. Wraps the existing `SearchInput` (`src/components/search.tsx`) bound via `onChange`, with an `sr-only` `<Label>` and a primary submit button. Empty submit → `/paints`; non-empty → `/paints?q={encoded}`.
- **Feature grid + cards** (`feature-grid.tsx`, `feature-card.tsx`) — responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, `max-w-6xl` container, section heading. Each card is a full-surface `<Link>` with `aria-label`, icon chip, title, and blurb.
- **CTA section** (`cta-section.tsx`) — auth-aware. Signed-out: "Create your account" → `/sign-up` (resolves via the `(auth)` route group) + "Browse paints" → `/paints`. Signed-in: "Open your collection" → `/collection` + "Build a palette" → `/user/palettes`. Uses `btn btn-primary` / `btn btn-ghost`.
- **Stats strip** (`stats-strip.tsx`) — added beyond the original plan; hardcoded social-proof row (`2,300+ paints`, `5 brands`, `Free to browse`) with a `TODO` to wire live counts later.
- **404 reuse** (`not-found-content.tsx`) — added beyond the original plan; `src/app/not-found.tsx` reuses this module component, also auth-aware.
- **SEO metadata** — `page.tsx` uses `pageMetadata({ title, description, path: '/', image: '/api/og/home', keywords })`. The `/api/og/home` edge OG route exists. Root `layout.tsx` provides default metadata + a `WebSite` JSON-LD `SearchAction`.
- **Responsive layout** — mobile single column, `sm` two-up, `lg` three-up; verified by class structure.

### Remaining work

#### Phase 1 — Hero visual decision (optional, ships green on its own)

The original plan called for an AI-generated `public/marketing/hero.webp`. The shipped hero instead uses a gradient band + brand strip — **no image was added**. This is a deliberate divergence and the page is complete without it.

- **Decision required:** either (a) close out the "hero ambient image" idea as intentionally dropped (gradient is the chosen treatment), or (b) add `public/marketing/hero.webp` and wire it into `hero.tsx` as a right-column visual at `lg+` (use `next/image` with `priority` since it's above the fold). The AI prompts below are retained as a record if (b) is chosen.
- If (b): create `public/marketing/` (does not exist yet), commit a single ~1200×800 webp (≤120 KB), alt text `"Painted miniatures arranged with paint pots and brushes."` This phase touches only `hero.tsx` and the new asset — types/lint stay green.

#### Phase 2 — Copy + data accuracy review (no structural change)

- **Stats strip values** (`stats-strip.tsx`) are hardcoded. Confirm `2,300+ paints` and `5 brands` match reality before relying on them as marketing claims, or implement the `TODO` to source live counts from a `services/` function (would add `src/modules/marketing/services/marketing-stats.ts` and make `StatsStrip` async). Decide whether live counts are worth the per-request query on the homepage.
- **Brand strip vs. feature copy consistency** (`brand-strip.tsx`, `features.ts`) — the brand strip lists 7 brands while the stats strip says "5 supported brands" and feature copy says "10+ other brands." Reconcile these numbers to one source of truth.
- **Final marketing copy pass** on hero, feature blurbs, and CTA headings (per the doc Notes — "copy quality matters more than code volume").

#### Phase 3 — Verification + known gaps

- Manually verify: hero search "red" + Enter → `/paints?q=red`; each feature card resolves (all linked routes exist except the feature list no longer references `/wheel`); CTA copy/links flip across auth states; reflow 360px → 1440px.
- Run `npm run build` and `npm run lint` and confirm clean. (A stale `.next` dev-types reference to `recipes/browse` may surface under a bare `tsc --noEmit`; a fresh `npm run build` is the source of truth.)
- Confirm Acceptance Criteria checkboxes match the shipped state (most are already checked; the unchecked hero-wordmark/logo item is intentionally deferred — see Risks, tagline-first hero).

### Affected Files (remaining)

| File | Status / Remaining change |
|------|---------------------------|
| `src/app/page.tsx` | ✅ Done — composes Hero/FeatureGrid/StatsStrip/CtaSection, reads auth, sets metadata |
| `src/modules/marketing/components/hero.tsx` | ✅ Done — Phase 1 (optional) adds an image column |
| `src/modules/marketing/components/hero-search.tsx` | ✅ Done |
| `src/modules/marketing/components/brand-strip.tsx` | ✅ Done — Phase 2 reconcile brand count |
| `src/modules/marketing/components/feature-grid.tsx` | ✅ Done |
| `src/modules/marketing/components/feature-card.tsx` | ✅ Done |
| `src/modules/marketing/components/stats-strip.tsx` | ✅ Done — Phase 2 may swap hardcoded values for live counts |
| `src/modules/marketing/components/cta-section.tsx` | ✅ Done |
| `src/modules/marketing/components/not-found-content.tsx` | ✅ Done (bonus — reused by `app/not-found.tsx`) |
| `src/modules/marketing/types/feature.ts` | ✅ Done |
| `src/modules/marketing/utils/features.ts` | ✅ Done — Phase 2 copy review |
| `src/modules/marketing/services/marketing-stats.ts` | Optional (Phase 2) — only if live stat counts are wired |
| `public/marketing/hero.webp` | Not created — Phase 1 decision (dropped vs. add) |

### AI image prompts (retained for Phase 1, option b)

> **Hero (primary, recommended).** "Hero illustration for a miniature painting color tool. Top-down studio shot of three painted fantasy miniatures clustered around a circular color wheel made of small paint pot caps in rainbow order, brushes radiating outward, soft warm rim lighting on a deep neutral background. Photorealistic with subtle painterly grain. 16:9 composition, generous negative space on the left for headline overlay. No text, no logos, no watermarks. Color palette leans Grimify dark theme: deep navy background, accents of warm red, ochre, teal."

> **Hero alternate (illustrated).** "Editorial flat illustration of a workbench overhead view: rows of paint pots in spectral order curving into a wheel, a single primed miniature in the center, a brush mid-stroke. Limited palette — desaturated background, three accent colors (warm red, teal, ochre). Vector-style, clean edges, no text. 16:9, negative space on left."

### Risks & Considerations

- **Card set diverged from the original draft** — the shipped feature list is Cross-Brand Search, Brand Browser, Palettes, Recipes, Collection (not Color Wheel/Schemes). `/wheel` is no longer referenced from the homepage. If Color Wheel/Schemes should appear, add them to `utils/features.ts` (single source of truth — one-file change).
- **Recipes route exists now** — `/recipes` resolves, so the earlier 404 risk is resolved.
- **Hero visual is a gradient, not an image** — the original AI-image plan was not executed. Resolve in Phase 1 (drop vs. add). Page is complete and shippable as-is.
- **`SearchInput` is controlled via `onChange` mirroring** — implemented as option (a) from the original plan; the hero tracks the value through `onChange` rather than refactoring `SearchInput`. Working as intended.
- **Auth read on the homepage** — `page.tsx` calls `supabase.auth.getUser()` on every load to drive the CTA. Accepted cost; not revisited.
- **Hardcoded stats** — `stats-strip.tsx` values are static and must be kept honest (Phase 2). The `5 brands` / `7 brands` / `10+ brands` copy across stats, brand strip, and feature blurbs should be reconciled.
- **Accessibility** — hero search has an `sr-only` `<Label>` and a labeled submit button; feature cards carry `aria-label`. Verify with a screen-reader pass during Phase 3.
- **Future-proofing** — `Feature[]` in `utils/features.ts` remains the single source of truth; adding/removing a card is a one-file change.

## Notes

- This page is the front door — copy quality matters more than code volume. Final marketing copy should be reviewed before merge.
- Image generation is one-shot; commit the chosen image as a webp and discard intermediate experiments.
- The hero search reuses `/paints?q=` rather than implementing its own search — keeps a single search code path.
- Once a recipes route ships, no change is needed here; the feature card will simply start resolving.
