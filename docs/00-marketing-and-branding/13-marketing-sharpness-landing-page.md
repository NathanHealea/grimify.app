# Marketing Sharpness & Landing Page Improvements

**Epic:** Marketing & Branding
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/marketing-landing-page-sharpness`
**Merge Into:** `main`

## Summary

Sharpen Grimify's homepage positioning based on a Product Hunt launch analysis. The core insight: niche tools win by being unmistakably *for someone* — lean harder into the "miniature painter with 200 pots of Citadel" identity rather than softening for a general design audience. Changes span the hero tagline, sub-headline, feature grid copy, CTA section, page metadata, and a new brand-name strip that makes the product's scope instantly recognisable.

## Acceptance Criteria

- [ ] Hero `<h1>` is updated to a sharper, action-oriented tagline that names the audience without using "research".
- [ ] Hero sub-headline names at least two real paint brands (Citadel, Vallejo, Army Painter) and speaks to the cross-brand wedge.
- [ ] A brand name strip is added below the hero search bar listing the major supported brands — visitors see "Citadel · Vallejo · Army Painter · …" in under 3 seconds.
- [ ] Feature grid section heading and sub-copy are rewritten to address the miniature painter directly.
- [ ] Feature card blurbs name specific brands where relevant (Cross-Brand Search, Brand Browser, Collection Tracking cards).
- [ ] CTA section guest-state heading and sub-copy are sharpened — names brands, addresses the "buying duplicates" pain, makes the free-to-browse CTA prominent.
- [ ] `page.tsx` metadata title and description are updated to match the new hero copy and include brand names for SEO.
- [ ] A static social-proof row is added between the feature grid and the CTA — shows paint count, brand count, and a community nudge. Uses hardcoded values initially with a clear comment marking where to wire in dynamic counts.
- [ ] No new dependencies introduced.
- [ ] `npm run build` and `npm run lint` pass with no errors or warnings.
- [ ] All copy changes are visible in `npm run dev` on the homepage in both guest and authenticated states.

## Implementation Plan

### Key insight driving every decision

> "One search bar for every Citadel, Vallejo & Army Painter paint" wins over "Color research for miniature painters" because it names the brands — brand names are identity flags and search magnets for the target audience. Every copy change should ask: *does this speak directly to the person with 200 pots on their shelf?*

---

### Step 1 — Update hero tagline and sub-headline

File: `src/modules/marketing/components/hero.tsx`

**`<h1>` change:**
```
Before: "Color research for miniature painters"
After:  "Find any miniature paint — across every brand"
```
Rationale: "Find" is active and outcome-oriented. "Across every brand" surfaces the cross-brand wedge without needing to spell it out.

**Sub-headline change:**
```
Before: "Search paints across every major brand, build palettes, track your
         collection, and share recipes — Grimify is the painter's color companion."
After:  "Search Citadel, Vallejo, Army Painter, Scale75, and more — all in one
         place. Build palettes, track your shelf, and share your recipes."
```
Names three real brands up front. Replaces "color companion" (vague) with a concrete benefit list using "your shelf" (painter-specific language).

---

### Step 2 — Create brand name strip component

File: `src/modules/marketing/components/brand-strip.tsx` *(new)*

A server component rendered between the hero search bar and the bottom edge of the hero section. Shows supported brand names as a muted, comma- or dot-separated trust strip.

```tsx
export function BrandStrip() {
  const brands = [
    'Citadel', 'Vallejo', 'Army Painter', 'Scale75',
    'Warcolours', 'Reaper', 'Monument Hobbies',
  ]
  return (
    <p className="text-xs text-muted-foreground text-center">
      Supports {brands.join(' · ')}
      {' '}and more
    </p>
  )
}
```

Wire into `hero.tsx` directly below `<HeroSearch />`, inside the existing flex column.

JSDoc: one-line summary per project convention.

---

### Step 3 — Update feature grid heading and blurbs

**`src/modules/marketing/components/feature-grid.tsx`** — section heading + sub-copy:

```
Heading:  "Everything in one place"
→ After:  "Built for miniature painters"

Sub-copy: "From discovery to documentation — the tools to research, plan, and share what you paint."
→ After:  "Cross-brand search, palette building, collection tracking — every tool on one shelf."
```

**`src/modules/marketing/utils/features.ts`** — blurbs that should name brands:

| Card | Current blurb | New blurb |
|------|--------------|-----------|
| Cross-Brand Search | "Search every major brand by name, hex code, or color and find the closest match." | "Search Citadel, Vallejo, Army Painter, and 10+ other brands by name, hex, or colour. Find the closest match in seconds." |
| Brand Browser | "Explore full paint lines from your favourite manufacturers side by side." | "Browse every Citadel, Vallejo, and Scale75 range — full product lines, side by side." |
| Collection Tracking | "Log the paints you own, plan your next purchase, and never buy a duplicate." | "Log every pot on your shelf, track what you're missing, and stop buying duplicates." |
| Palettes | unchanged — already good | — |
| Painting Recipes | unchanged — already good | — |

---

### Step 4 — Sharpen CTA section copy

File: `src/modules/marketing/components/cta-section.tsx`

Guest state only (authenticated state copy is already adequate):

```
Heading:  "Start your color research today"
→ After:  "Stop buying duplicate paints."

Sub-copy: "Free to use — sign up to save palettes and track your collection,
           or browse the paint library as a guest."
→ After:  "Search Citadel, Vallejo, Army Painter, and every major brand —
           free, no account needed. Sign up to save palettes and track your shelf."
```

Primary CTA label stays "Create your account". Secondary stays "Browse paints" — already surfaces the free guest-browse path, which the PH analysis flagged as a conversion advantage.

---

### Step 5 — Add static social-proof row

File: `src/modules/marketing/components/stats-strip.tsx` *(new)*

A simple horizontal stat row rendered between `<FeatureGrid />` and `<CtaSection />` in `page.tsx`. Values are hardcoded for now.

```tsx
export function StatsStrip() {
  // TODO: replace with live counts from the database once user growth warrants it
  const stats = [
    { value: '7,000+', label: 'paints indexed' },
    { value: '15+',    label: 'supported brands' },
    { value: 'Free',   label: 'to browse — always' },
  ]
  return (
    <section className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-8 px-4 py-10 text-center">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-2xl font-semibold tracking-tight">{value}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

Wire into `src/app/page.tsx` between `<FeatureGrid />` and `<CtaSection />`.

Verify the paint/brand counts are realistic before shipping — check against the actual database. Update the hardcoded values if needed.

---

### Step 6 — Update page metadata

File: `src/app/page.tsx`

```ts
// Before
title: 'Color research for miniature painters'
description: 'Search paints across every major brand, build palettes, ...'

// After
title: 'Find any miniature paint — Citadel, Vallejo, Army Painter and more'
description: 'Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands
              in one place. Build palettes, track your collection, and share
              painting recipes — free to browse, no account needed.'
```

---

### Order of operations

1. Step 1 — hero copy (hero.tsx)
2. Step 2 — BrandStrip component + wire into hero.tsx
3. Step 3 — feature grid copy (feature-grid.tsx + features.ts)
4. Step 4 — CTA copy (cta-section.tsx)
5. Step 5 — StatsStrip component + wire into page.tsx
6. Step 6 — page metadata (page.tsx)
7. Build and lint verify

Steps 1–6 are all copy/component changes with no database or routing implications — they can be done in any order, but top-to-bottom matches the page render order and makes reviewing easier.

### Affected Files

| File | Change |
|------|--------|
| `src/modules/marketing/components/hero.tsx` | New tagline, new sub-headline, import + render BrandStrip |
| `src/modules/marketing/components/brand-strip.tsx` | **New** — supported brand name trust strip |
| `src/modules/marketing/components/feature-grid.tsx` | Section heading + sub-copy rewrite |
| `src/modules/marketing/utils/features.ts` | Blurb updates for 3 feature cards |
| `src/modules/marketing/components/cta-section.tsx` | Guest-state heading + sub-copy rewrite |
| `src/modules/marketing/components/stats-strip.tsx` | **New** — static social-proof stat row |
| `src/app/page.tsx` | Updated metadata title + description; add StatsStrip between FeatureGrid and CtaSection |

### Risks & Considerations

- **Brand name accuracy** — Verify that "Citadel", "Vallejo", "Army Painter", "Scale75" are all present and searchable in the live database before shipping copy that names them. A visitor who searches for Citadel and gets zero results will bounce immediately.
- **Stats strip accuracy** — Hardcoded counts (7,000+ paints, 15+ brands) must reflect the actual dataset. Query `SELECT COUNT(*) FROM paints` and `SELECT COUNT(DISTINCT brand_id) FROM paints` before publishing. Adjust the hardcoded values accordingly.
- **Brand trademark risk** — All named brands are third-party trademarks. The site is an independent research tool. Add or verify a footer/about disclaimer: "Independent tool — not affiliated with Games Workshop, Vallejo, or The Army Painter."
- **Don't over-index on PH audience** — These changes target the miniature painter directly, which is the right call. Resist the temptation to add a "for designers too" hedge — that dilutes the positioning.
- **Authenticated CTA state** — The authenticated heading ("Pick up where you left off") and authenticated sub-copy are already painter-specific enough. Do not change them in this PR to keep the diff focused.
