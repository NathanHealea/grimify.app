# Metadata & OpenGraph Marketing Alignment

**Epic:** Marketing & Branding
**Type:** Enhancement
**Status:** Completed
**Branch:** `enhancement/metadata-og-alignment`
**Merge Into:** `main`

## Summary

Update site-wide metadata and Open Graph copy to match the sharpened marketing positioning from doc `13-marketing-sharpness-landing-page.md`. Every public-facing page currently uses generic descriptions like "color research" and "every supported brand" — none name Citadel, Vallejo, or Army Painter. These names are identity flags and search keywords for the target audience. This pass replaces vague copy with brand-specific, painter-direct language across the root layout, all high-traffic public pages, the sign-up conversion page, and the dynamic brand detail description pattern.

**Relationship to doc 13:** That doc updates the homepage hero section and page metadata. This doc is complementary — it covers the root layout default and all non-homepage public routes. Both can be implemented independently; run them in either order.

## Acceptance Criteria

- [x] Root layout default description names at least three real paint brands and leads with cross-brand search.
- [x] Root layout `keywords` array includes brand names: Citadel, Vallejo, Army Painter, Scale75, Reaper, Warhammer.
- [x] Root layout OG and Twitter default title updated to include a tagline alongside "Grimify".
- [x] Root layout OG image `alt` text is updated to match the new tagline.
- [x] `/paints` page description names at least three brands and ends with a shelf/collection hook.
- [x] `/brands` page description names at least three brands and states the catalog value.
- [x] `/palettes` page description addresses the miniature painter directly.
- [x] `/recipes` page description addresses the miniature painter directly and names techniques/paints.
- [x] `/compare` page description names brands in the comparison context.
- [x] `/discontinued` page description names brands in the discontinuation context.
- [x] `/sign-up` page description names brands and leads with the free-account hook.
- [x] Dynamic brand detail `generateMetadata` description pattern is improved to name the brand, count, and cross-brand value.
- [x] `npm run build` and `npm run lint` pass with no errors or warnings.
- [x] No new dependencies introduced.

## Implementation Plan

### Key principle

Every description should answer: *"What does this page do for a miniature painter who just searched 'Citadel Vallejo comparison'?"* Brand names are the hook — use them early in the description string, not buried at the end.

---

### Step 1 — Root layout default metadata

File: `src/app/layout.tsx`

**`description` constant:**
```
Before: "Interactive color research and collection management for miniature painters —
         paint library, cross-brand comparisons, palettes, and recipes."

After:  "Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands in one
         place. Build palettes, track your shelf, and share painting recipes —
         free to browse, no account needed."
```

**`keywords` array:**
```ts
// Before
['miniature painting', 'warhammer paints', 'paint comparison', 'paint collection',
 'color palette', 'color wheel', 'recipes', 'tabletop hobby']

// After
['miniature painting', 'Citadel paints', 'Vallejo paints', 'Army Painter', 'Scale75',
 'Reaper paints', 'cross-brand paint search', 'paint collection tracker',
 'paint comparison', 'color palette', 'tabletop hobby', 'Warhammer paints',
 'miniature paint database']
```

**Root OG and Twitter `title`:**
```
Before: "Grimify"
After:  "Grimify — Find any miniature paint"
```

**OG image `alt`:**
```
Before: "Grimify"
After:  "Grimify — Find any miniature paint across every brand"
```

---

### Step 2 — Paints browse page

File: `src/app/paints/page.tsx`

```
Before: "Browse and search miniature paints across every supported brand.
         Filter by hue, compare swatches, and add to your collection."

After:  "Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands
         by name, hex, or colour. Filter by hue, compare swatches, and track
         what you own."
```

---

### Step 3 — Brands browse page

File: `src/app/brands/page.tsx`

```
Before: "Browse miniature paint brands and their product lines on Grimify."

After:  "Browse every Citadel, Vallejo, Army Painter, Scale75 and 10+ other
         miniature paint ranges — full product lines in one place."
```

---

### Step 4 — Palettes browse page

File: `src/app/palettes/page.tsx`

```
Before: "Browse paint palettes shared by the Grimify community."

After:  "Discover paint palettes built by miniature painters. Find inspiration
         for your next Citadel or Vallejo colour scheme."
```

---

### Step 5 — Recipes browse page

File: `src/app/recipes/page.tsx`

```
Before: "Discover step-by-step painting recipes from the Grimify community."

After:  "Discover step-by-step painting recipes from the miniature painting
         community — techniques, paint lists, and photos."
```

---

### Step 6 — Compare page

File: `src/app/compare/page.tsx`

```
Before: "Compare up to six miniature paints side by side. Inspect brand,
         product line, hex, and pairwise CIE76 ΔE color difference."

After:  "Compare Citadel, Vallejo, Army Painter and any other brand side by
         side — hex values, product lines, and perceptual colour distance
         at a glance."
```

---

### Step 7 — Discontinued page

File: `src/app/discontinued/page.tsx`

```
Before: "Browse every discontinued miniature paint in the catalog and view
         cross-brand substitute suggestions ranked by perceptual color distance."

After:  "Every discontinued Citadel, Vallejo and Army Painter paint — with
         cross-brand substitute suggestions ranked by perceptual colour distance."
```

---

### Step 8 — Sign-up page

File: `src/app/(auth)/sign-up/page.tsx`

```
Before: "Sign up for Grimify to build your paint collection, palettes, and recipes."

After:  "Create a free Grimify account to track your Citadel, Vallejo and Army
         Painter collection, build palettes, and share painting recipes."
```

---

### Step 9 — Dynamic brand detail description

File: `src/app/brands/[id]/page.tsx` → `generateMetadata`

```ts
// Before
description: `${brand.name} miniature paints on Grimify. ${count} paint(s).`

// After
description: `Browse ${count} ${brand.name} miniature paints on Grimify —
              full product lines, hex codes, and cross-brand comparisons.`
```

Locate the exact description string inside `generateMetadata` and update the template literal. The `count` and `brand.name` variables are already in scope from the existing data fetch — no new queries needed.

---

### Order of operations

Steps 1–8 are all independent string changes in different files. Step 9 is in a `generateMetadata` function but is equally simple. Any order works; top-to-bottom matches page hierarchy.

1. Step 1 — root layout (highest-impact, sets the fallback for everything)
2. Steps 2–8 — public browse pages and sign-up, any order
3. Step 9 — dynamic brand detail
4. Build and lint verify

### Affected Files

| File | Change |
|------|--------|
| `src/app/layout.tsx` | description, keywords, OG/Twitter title, OG image alt |
| `src/app/paints/page.tsx` | description |
| `src/app/brands/page.tsx` | description |
| `src/app/palettes/page.tsx` | description |
| `src/app/recipes/page.tsx` | description |
| `src/app/compare/page.tsx` | description |
| `src/app/discontinued/page.tsx` | description |
| `src/app/(auth)/sign-up/page.tsx` | description |
| `src/app/brands/[id]/page.tsx` | `generateMetadata` description template |

### Out of scope

- **`/paints/[id]`** — Paint detail descriptions are already entity-specific (name, brand, hex). No copy change needed.
- **`/palettes/[id]` and `/recipes/[id]`** — Use per-entity titles and descriptions derived from user content.
- **`/users/[id]`** — User profiles use user-generated bio content.
- **Admin pages** — All `noindex: true`; no SEO value.
- **Auth pages** (sign-in, reset, forgot, profile/setup, profile/edit) — Either `noindex: true` or purely functional pages. No change.
- **Legal pages** (terms, code-of-conduct) — Content is accurate as-is; tone change not needed.
- **`og-image.png`** — The static 1200×630 default OG image currently shows generic "Grimify" branding. Regenerating it to show the paint search interface and new tagline is a **design task** tracked separately. The alt text update in Step 1 is the only code change; a new image file can be swapped in without another PR once design is ready.

### Risks & Considerations

- **Overlap with doc 13** — Doc 13 (marketing sharpness) updates `src/app/page.tsx` metadata in its Step 6. This doc does not touch `page.tsx`. Implement either doc first; they are non-conflicting.
- **Brand name accuracy** — Same check as doc 13: verify Citadel, Vallejo, Army Painter, Scale75 are all present and searchable in the live database before shipping copy that names them.
- **`generateMetadata` in brands/[id]** — The description pattern update is a template literal change only. Confirm the existing `count` variable reflects total paint count (not product line count) so the number quoted is meaningful.
- **Character limits** — Google typically truncates descriptions at ~155 characters. Each new description should stay under 155 chars to avoid truncation in SERPs.
