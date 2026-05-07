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

### Domain module placement

Create a new `src/modules/marketing/` module per the Domain Module convention:

```
src/modules/marketing/
├── components/
│   ├── hero.tsx
│   ├── hero-search.tsx       (client)
│   ├── feature-grid.tsx
│   ├── feature-card.tsx
│   └── cta-section.tsx
├── types/
│   └── feature.ts
└── utils/
    └── features.ts
```

`src/app/page.tsx` becomes a thin server component that reads the auth state and composes `<Hero />`, `<FeatureGrid />`, `<CtaSection />`.

### 1. Define the `Feature` type and feature list

`src/modules/marketing/types/feature.ts`:

```ts
import type { LucideIcon } from 'lucide-react'

export type Feature = {
  /** Slug used for keys and analytics — e.g., 'color-wheel'. */
  slug: string
  /** Card title — keep to ~3 words. */
  title: string
  /** One-line blurb explaining the feature. */
  blurb: string
  /** lucide-react icon component. */
  icon: LucideIcon
  /** Destination route the card links to. */
  href: string
}
```

`src/modules/marketing/utils/features.ts` — static list (Color Wheel, Paints/Cross-Brand, Schemes, Palettes & Collection, Recipes). Keep recipes' `href` as `/recipes` even though that route is future — we can wire it later, or comment-flag it.

### 2. Hero with search

`hero.tsx` (server) — full-width section with vertical centering, max-w-3xl text column, large display heading. Wraps `<HeroSearch />` for the client island.

`hero-search.tsx` (client) — uses `useRouter` from `next/navigation`:

```tsx
'use client'

const router = useRouter()
const [q, setQ] = useState('')

function handleSubmit(e: SubmitEvent) {
  e.preventDefault()
  const trimmed = q.trim()
  router.push(trimmed ? `/paints?q=${encodeURIComponent(trimmed)}` : '/paints')
}
```

Render a `<form>` containing the existing `SearchInput` (binding `value`/`onChange` so we control the value) plus a primary submit button. Use the daisyUI `.btn .btn-primary` classes for visual consistency.

The placeholder copy: `"Search by paint name, brand, or hex (e.g. Mephiston Red, #8b1a1a)"`.

### 3. Features section

`feature-grid.tsx` — section wrapper with heading ("Everything in one place" or similar) and a responsive grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`.

`feature-card.tsx` — wraps content in a `<Link>` so the entire card is clickable. Uses the existing `card` daisyUI utility (`src/styles/`), shows the icon at the top, then title + blurb.

Feature list (initial copy):

| slug              | title              | blurb                                                                              | icon (lucide) | href        |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------- | ------------- | ----------- |
| `color-wheel`     | Color Wheel        | Map every paint you own onto an interactive color wheel and see your gaps at a glance. | `Disc3`       | `/wheel`    |
| `paints`          | Cross-Brand Search | Search every supported paint range and find the closest match across brands.        | `Search`      | `/paints`   |
| `schemes`         | Color Schemes      | Build complementary, split, and analogous schemes from any starting paint.          | `Palette`     | `/schemes`  |
| `palettes`        | Palettes & Collection | Save palettes for projects, track what's on your shelf, and share with the community. | `Layers`      | `/palettes` |
| `recipes`         | Recipes            | Document and share step-by-step painting recipes with paints, layers, and notes.    | `BookOpen`    | `/recipes`  |

### 4. CTA section

`cta-section.tsx` (server) — accepts an `isAuthenticated: boolean` prop. Two-button layout, primary + ghost.

- Signed-out: **"Create your account"** → `/sign-up` (primary), **"Browse paints"** → `/paints` (ghost)
- Signed-in: **"Open your collection"** → `/collection` (primary), **"Build a palette"** → `/palettes` (ghost)

### 5. Compose the page

`src/app/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { Hero } from '@/modules/marketing/components/hero'
import { FeatureGrid } from '@/modules/marketing/components/feature-grid'
import { CtaSection } from '@/modules/marketing/components/cta-section'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({ title: '...', description: '...', path: '/' })

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Hero />
      <FeatureGrid />
      <CtaSection isAuthenticated={!!user} />
    </main>
  )
}
```

The existing root layout already provides Navbar + Footer; the page only owns content between them.

### 6. Hero ambient image

Add a single AI-generated hero image at `public/marketing/hero.webp` (target ~1200×800, ≤120 KB after webp compression). Used either as a right-column visual at lg+ breakpoints or as a soft background with overlay — pick one based on visual fit; do not use both. Alt text: `"Painted miniatures arranged with paint pots and brushes."`

**AI image prompts** (use whichever generator — keep them all in this doc so we have a record):

> **Hero (primary, recommended).** "Hero illustration for a miniature painting color tool. Top-down studio shot of three painted fantasy miniatures clustered around a circular color wheel made of small paint pot caps in rainbow order, brushes radiating outward, soft warm rim lighting on a deep neutral background. Photorealistic with subtle painterly grain. 16:9 composition, generous negative space on the left for headline overlay. No text, no logos, no watermarks. Color palette leans Grimify dark theme: deep navy background, accents of warm red, ochre, teal."

> **Hero alternate (illustrated).** "Editorial flat illustration of a workbench overhead view: rows of paint pots in spectral order curving into a wheel, a single primed miniature in the center, a brush mid-stroke. Limited palette — desaturated background, three accent colors (warm red, teal, ochre). Vector-style, clean edges, no text. 16:9, negative space on left."

> **Optional feature thumbnails (only if we upgrade beyond lucide icons):**
> - **Color Wheel** — "Macro top-down photograph of paint pot lids arranged into a precise color wheel on dark wood, single soft directional light, no text. Square 1:1."
> - **Cross-Brand Search** — "Three paint bottles from different visual brand styles lined up with their caps off, near-identical red pigment in each, macro depth-of-field, dark studio backdrop. 1:1."
> - **Color Schemes** — "Five painted swatch cards on dark felt arranged in a fan, colors forming a split-complementary scheme. 1:1."
> - **Palettes & Collection** — "Open painter's case with neat rows of labeled paint pots, slight overhead angle, warm task lighting. 1:1."
> - **Recipes** — "A weathered painter's notebook open to a hand-drawn recipe sheet listing layered paints with arrows, beside a finished miniature. 1:1."

**Recommendation:** ship v1 with only the hero image + lucide icons. Upgrade feature cards to AI thumbnails in a follow-up PR if/when we want a richer feel — keeps this PR small and the per-feature icons remain swap-friendly later.

### 7. SEO metadata

Update `pageMetadata` for `/` to use a marketing-focused title and description (the current root `metadata` in `src/app/layout.tsx` is already good for the site default — for the page itself, give a tighter, value-prop-led description):

- title: `"Color research for miniature painters"` *(already set in current page.tsx — keep)*
- description: refine to mention search + community, e.g. `"Search paints across every major brand, build palettes, track your collection, and share recipes — Grimify is the painter's color companion."`

### 8. Verification

- Visit `/` — hero, features, CTA all render.
- Type "red" + Enter in the hero search — navigates to `/paints?q=red`.
- Click each feature card — lands on the correct route (recipes is OK if it 404s for now; document as known gap).
- Sign-out vs signed-in — CTA copy and links flip.
- Resize from 360px → 1440px — layout reflows cleanly.
- Lighthouse pass: hero image lazy-loaded only if below the fold (it'll be above the fold, so use `priority` on `<Image>`).

### Affected Files

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Replace empty body; read auth state; compose `<Hero/>`, `<FeatureGrid/>`, `<CtaSection/>` |
| `src/modules/marketing/components/hero.tsx` | New — server component with text column + image slot + `<HeroSearch />` |
| `src/modules/marketing/components/hero-search.tsx` | New — client component, form wrapping `SearchInput`, navigates to `/paints?q=…` |
| `src/modules/marketing/components/feature-grid.tsx` | New — section wrapper, responsive grid mapping `Feature[]` to `<FeatureCard/>` |
| `src/modules/marketing/components/feature-card.tsx` | New — clickable card with icon + title + blurb |
| `src/modules/marketing/components/cta-section.tsx` | New — auth-aware CTA pair |
| `src/modules/marketing/types/feature.ts` | New — `Feature` type |
| `src/modules/marketing/utils/features.ts` | New — static `Feature[]` list |
| `public/marketing/hero.webp` | New — AI-generated hero image (see prompts) |

### Risks & Considerations

- **`SearchInput` is currently uncontrolled-ish** — it manages its own state and only forwards `onChange`. The hero form needs to track the same value to submit. Either (a) read the value from the `onChange` event into the parent's state, or (b) refactor `SearchInput` to be fully controlled. Option (a) is the smaller change and what the plan assumes.
- **Recipes route doesn't exist yet** — the recipes feature card will 404 until `/recipes` ships. Either (a) link to `/recipes` and accept the 404 as a known gap, (b) hide the card until the route exists, (c) link to the planning doc instead. **Recommend (a)** — surfaces the roadmap, but call it out in the PR description.
- **Hero image budget** — single ambient image only; no per-feature images in v1. If the user later wants AI thumbnails for each card, the prompts are documented above.
- **Auth read on the homepage adds a request** — the CTA needs `supabase.auth.getUser()`. Cost is minimal but it does run on every page load. Consider whether the marketing page should always render the signed-out CTA and only branch in client-side hydration if speed is a concern; v1 keeps the SSR approach for simplicity.
- **Logo placement** — the navbar already shows the wordmark. Avoid re-rendering the logo at full size in the hero; instead lead with a tagline-first hero. Keeps the hero from feeling redundant.
- **Brand consistency** — use existing daisyUI/tailwind tokens; do not introduce a marketing-only color or typography scale. Hero typography can use the existing display sizes (`text-4xl sm:text-5xl lg:text-6xl`).
- **Accessibility** — hero search needs an associated `<label>` (visually hidden is fine), submit button needs a clear label, feature cards need either a discernible name on the link or `aria-label`.
- **Empty/short search submit** — submitting an empty query should still go to `/paints` (full list), not stay on `/`. The plan handles this.
- **Future-proofing** — keep `Feature[]` as a single source of truth in `utils/features.ts` so adding/removing a feature is a one-file change.

## Notes

- This page is the front door — copy quality matters more than code volume. Final marketing copy should be reviewed before merge.
- Image generation is one-shot; commit the chosen image as a webp and discard intermediate experiments.
- The hero search reuses `/paints?q=` rather than implementing its own search — keeps a single search code path.
- Once a recipes route ships, no change is needed here; the feature card will simply start resolving.
