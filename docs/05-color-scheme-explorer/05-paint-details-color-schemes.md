# Paint Details Color Schemes Section

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Completed
**Branch:** `feature/paint-details-color-schemes-compact`
**Merge into:** `epic/color-schema-explorer`

## Summary

Replace the current paint-detail `Color schemes` section (which embeds the full `/schemes` UI via `SchemeDisplay`) with a denser, paint-detail-specific layout. The new section renders **every** scheme (complementary, split-complementary, analogous, triadic, tetradic) at once — no scheme-type selector — and shows only the catalog paint matches for each non-base partner color. The implicit "root" color (the paint the user is viewing) is **not** rendered, since it's already the subject of the page above.

Each partner color is represented by a row of **five** catalog paints, ordered light → dark, with the canonical (closest-hue) match in the center. This gives the user an at-a-glance value-scale of complementary/analogous/triadic/tetradic paint options without making them flip through a selector.

The hook (`useColorScheme`) and the original `SchemeDisplay` continue to live in `color-schemes/` for use by `/schemes`. This feature introduces a new sibling component family (`SchemeOverview`, `SchemeOverviewBlock`, `SchemePartnerRow`) and a new value-scale matching util — none of which touch the existing `/schemes` page.

## Acceptance Criteria

- [ ] The paint detail page (`/paints/[id]`) renders a single `Color schemes` section containing all five scheme types stacked vertically — no selector, no tabs.
- [ ] The paint's own color (the implicit base / "root") is **not** rendered anywhere inside the section. Each row shows the partner color and its matched catalog paints only.
- [ ] Each non-base partner color renders a row of **exactly five** catalog paint chips, ordered light → dark by lightness, with the canonical (closest-hue) match in the center (index 2).
- [ ] Scheme blocks render the following partner rows:
  - **Complementary** — 1 row (`Complement`)
  - **Split-complementary** — 2 rows (`Split 1`, `Split 2`)
  - **Analogous** — 2 rows (`Analogous −n°`, `Analogous +n°`)
  - **Triadic** — 2 rows (`Triad 1`, `Triad 2`)
  - **Tetradic** — 3 rows (`Tetrad 1`, `Complement`, `Tetrad 3`)
- [ ] An inline angle slider (15°–60°, default 30°) on the analogous block updates only the analogous rows; other blocks are unaffected.
- [ ] Each chip shows the paint's swatch color, name, brand, and hex; the chip is a link to `/paints/[id]` for that paint.
- [ ] Each chip in the user's collection shows a small owned-state indicator (e.g. a filled dot or check overlay). Chips do **not** render inline collection toggle buttons in this layout — toggling happens on the linked paint detail page.
- [ ] The canonical (center) chip has a subtle visual emphasis (e.g. ring/border) so the user can see the closest match at a glance.
- [ ] If fewer than five catalog paints match the hue band, the row is padded by extending the candidate pool by hue distance (next-nearest by hue, then sorted into value-scale order). The row always renders exactly five chips when the catalog has ≥5 paints; if the catalog has fewer than five paints total, the row renders whatever is available.
- [ ] The section renders for every paint (discontinued or not) on `/paints/[id]`, placed after the hue classification block and before `PaintSimilarSection`.
- [ ] The `Save as palette` button is **not** rendered in this section. Users wanting to save a derived palette can do so from `/schemes`.
- [ ] All exports include JSDoc per `CLAUDE.md`.
- [ ] No barrel/index re-exports are introduced.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Dependencies

- **Requires `04-scheme-explorer-refactor`** (already merged into the epic). This feature reuses `generateScheme`, `BaseColor`, and `SchemeColor` from that refactor's home in `color-schemes/`.

## Domain Module

Primary modules touched:

- `src/modules/color-schemes/` — new components (`SchemeOverview`, `SchemeOverviewBlock`, `SchemePartnerRow`), new type (`SchemePartner`), and new utils (`get-scheme-partners`, `find-value-scale-nearest-paints`).
- `src/modules/paints/` — `paint-color-schemes-section.tsx` is modified to mount `<SchemeOverview>` in place of `<SchemeDisplay>`.

Consumed (no changes): `paint-service.getColorWheelPaints`, `collection-service.getUserPaintIds`. `useColorScheme` and `SchemeDisplay` are **not** consumed by this feature — they remain in service of `/schemes`.

## Routes

| Route          | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `/paints/[id]` | Paint detail page — `Color schemes` section is replaced by the new layout.   |

## Key Files

| Action | File                                                                                   | Description                                                                                                                |
| ------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Create | `src/modules/color-schemes/utils/find-value-scale-nearest-paints.ts`                   | Value-scale nearest-paint matcher: top-K by hue → canonical + 2 lighter + 2 darker → sorted light→dark.                    |
| Create | `src/modules/color-schemes/types/scheme-partner.ts`                                    | `SchemePartner = { label: string; hue: number; paints: ColorWheelPaint[] }`.                                               |
| Create | `src/modules/color-schemes/utils/get-scheme-partners.ts`                               | For a scheme + base color, returns the partner colors (with `Base` filtered out) populated with value-scale paint matches. |
| Create | `src/modules/color-schemes/components/scheme-overview.tsx`                             | Orchestrator: renders all five scheme blocks, owns the analogous-angle state.                                              |
| Create | `src/modules/color-schemes/components/scheme-overview-block.tsx`                       | One scheme block: header + N partner rows. Receives partners as a prop.                                                    |
| Create | `src/modules/color-schemes/components/scheme-partner-row.tsx`                          | One partner row: label + 5 chips. Pure presentation.                                                                       |
| Modify | `src/modules/paints/components/paint-color-schemes-section.tsx`                        | Replace the inner `<SchemeDisplay ... />` with `<SchemeOverview baseColor={...} paints={...} ownedIds={...} />`.           |

No changes are required to `paint-detail.tsx`, `app/paints/[id]/page.tsx`, or any existing `color-schemes` files. The data plumbing (`paints`, `collectionPaintIds`) is already in place from the original feature-05 implementation.

## Existing Building Blocks (Reuse)

| Building block              | Path                                                              | Use in this feature                                                                              |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `generateScheme`            | `src/modules/color-schemes/utils/generate-scheme.ts`              | Computes the partner hues for each scheme. `Base` entries are filtered out by `getSchemePartners`. |
| `BaseColor`                 | `src/modules/color-schemes/types/base-color.ts`                   | Input shape for `getSchemePartners`.                                                             |
| `SchemeColor`               | `src/modules/color-schemes/types/scheme-color.ts`                 | Intermediate shape returned by `generateScheme`; the value `nearestPaints` field is ignored.     |
| `ColorWheelPaint`           | `src/modules/color-wheel/types/color-wheel-paint.ts`              | Catalog paint shape consumed by the value-scale matcher and rendered by `SchemePartnerRow`.      |
| `circularHueDistance`       | (existing helper inside `find-nearest-paints.ts`)                 | Reused by the new matcher; if currently private, extract it into its own file under `color-schemes/utils/` and import from both. |
| `cn`                        | `src/lib/utils.ts`                                                | Class merging on chips and rows.                                                                 |

## Implementation

### Step 1 — Value-scale matcher util

**`src/modules/color-schemes/utils/find-value-scale-nearest-paints.ts`**

```ts
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Selects five catalog paints near `targetHue`, ordered light→dark, with the
 * closest-hue match centered at index 2.
 *
 * Algorithm:
 *   1. Rank all paints by circular hue distance to `targetHue`.
 *   2. Take the top `huePoolSize` candidates (default 12) — this is the "hue band".
 *   3. The closest-hue paint becomes the **canonical** match (lands at index 2).
 *   4. From the remaining candidates, pick the two with `lightness > canonical.lightness`
 *      closest to canonical (these become the "lighter" pair).
 *   5. From the remaining, pick the two with `lightness < canonical.lightness`
 *      closest to canonical (these become the "darker" pair).
 *   6. If fewer than 2 candidates exist on either side, fall back to the next-best
 *      candidates by hue distance regardless of side. Total result is min(5, paints.length).
 *   7. Sort the resulting set by lightness **descending** (lightest first) so the
 *      row reads light→dark left-to-right.
 *
 * @param targetHue - The hue (0–360) to match against.
 * @param paints - Catalog paints to search.
 * @param huePoolSize - Size of the hue-ranked candidate pool. Defaults to 12.
 * @returns Up to five paints, sorted light→dark. Canonical match is at the lightness
 *   position naturally produced by the sort — when the algorithm finds exactly 2 lighter
 *   and 2 darker candidates, the canonical lands at index 2 (the center).
 */
export function findValueScaleNearestPaints(
  targetHue: number,
  paints: ColorWheelPaint[],
  huePoolSize = 12,
): ColorWheelPaint[] {
  // implementation per the spec above
}
```

JSDoc the function. Keep the implementation pure and unit-friendly.

### Step 2 — `SchemePartner` type

**`src/modules/color-schemes/types/scheme-partner.ts`**

```ts
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A non-base partner color in a scheme, paired with its value-scale paint matches.
 *
 * Partners are everything `generateScheme` returns *except* the entry labelled `Base`.
 *
 * @property label - The display label from `generateScheme` (e.g. `Complement`, `Split 1`, `Analogous −30°`).
 * @property hue - The partner's hue in degrees (0–360).
 * @property paints - Up to five catalog paints matched by {@link findValueScaleNearestPaints}, ordered light→dark.
 */
export type SchemePartner = {
  label: string
  hue: number
  paints: ColorWheelPaint[]
}
```

### Step 3 — Partner builder util

**`src/modules/color-schemes/utils/get-scheme-partners.ts`**

```ts
import { findValueScaleNearestPaints } from '@/modules/color-schemes/utils/find-value-scale-nearest-paints'
import { generateScheme } from '@/modules/color-schemes/utils/generate-scheme'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemePartner } from '@/modules/color-schemes/types/scheme-partner'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Builds the non-base partners for a scheme, populated with value-scale paint matches.
 *
 * @param base - The implicit root color (e.g. the paint the user is viewing).
 * @param scheme - The scheme type to compute partners for.
 * @param paints - Catalog paints used by the value-scale matcher.
 * @param analogousAngle - Spread angle for analogous schemes (15°–60°, default 30°). Ignored for other schemes.
 * @returns Partners (in the order produced by {@link generateScheme}) with the `Base` entry filtered out.
 */
export function getSchemePartners(
  base: BaseColor,
  scheme: ColorScheme,
  paints: ColorWheelPaint[],
  analogousAngle = 30,
): SchemePartner[] {
  return generateScheme(base, scheme, analogousAngle)
    .filter((c) => c.label !== 'Base')
    .map((c) => ({
      label: c.label,
      hue: c.hue,
      paints: findValueScaleNearestPaints(c.hue, paints),
    }))
}
```

### Step 4 — `SchemePartnerRow` component

**`src/modules/color-schemes/components/scheme-partner-row.tsx`** — `'use client'` not required (pure presentation), but mark client if it imports `Link` and we prefer consistency. Practical recommendation: leave it server-renderable.

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Renders one partner row: label + a fixed-width strip of five paint chips,
 * ordered light→dark, with the canonical (closest-hue) chip emphasised.
 *
 * @param props.label - Partner label (e.g. `Complement`, `Triad 1`, `Analogous −30°`).
 * @param props.hue - Partner hue in degrees, displayed alongside the label.
 * @param props.paints - Up to five paints to render. Center index (2) is the canonical match.
 * @param props.ownedIds - Set of paint IDs in the current user's collection — drives the small owned-state dot.
 */
export function SchemePartnerRow({
  label,
  hue,
  paints,
  ownedIds,
}: {
  label: string
  hue: number
  paints: ColorWheelPaint[]
  ownedIds: Set<string>
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{Math.round(hue)}°</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {paints.map((p, i) => (
          <Link
            key={p.id}
            href={`/paints/${p.id}`}
            className={cn(
              'flex flex-col gap-1 rounded-md border border-border p-2 transition hover:border-foreground/40',
              i === 2 && 'ring-2 ring-foreground/20',
            )}
            aria-label={`${p.name} (${p.brand_name}) — ${p.hex}`}
          >
            <span
              className="aspect-square w-full rounded"
              style={{ backgroundColor: p.hex }}
              aria-hidden
            />
            <span className="line-clamp-2 text-xs font-medium">{p.name}</span>
            <span className="line-clamp-1 text-[10px] text-muted-foreground">{p.brand_name}</span>
            <span className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span>{p.hex}</span>
              {ownedIds.has(p.id) && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="In your collection" />
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- The center chip's emphasis is a subtle `ring-2`; tune in QA if it competes too hard with the page chrome.
- The owned-state indicator is a small dot, not a button. Toggling is intentionally not exposed in this layout — the user follows the chip link to the paint page if they want to act.

### Step 5 — `SchemeOverviewBlock` component

**`src/modules/color-schemes/components/scheme-overview-block.tsx`**

```tsx
import { SchemePartnerRow } from '@/modules/color-schemes/components/scheme-partner-row'
import type { SchemePartner } from '@/modules/color-schemes/types/scheme-partner'
import type { ReactNode } from 'react'

/**
 * One scheme block — header (title + optional control slot) followed by partner rows.
 *
 * @param props.title - Scheme display name (e.g. `Complementary`, `Split-Complementary`).
 * @param props.partners - Non-base partner colors with their value-scale matches.
 * @param props.ownedIds - Forwarded to each {@link SchemePartnerRow}.
 * @param props.control - Optional slot for inline controls (e.g. analogous angle slider).
 */
export function SchemeOverviewBlock({
  title,
  partners,
  ownedIds,
  control,
}: {
  title: string
  partners: SchemePartner[]
  ownedIds: Set<string>
  control?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {control ?? null}
      </div>
      <div className="flex flex-col gap-3">
        {partners.map((p) => (
          <SchemePartnerRow
            key={p.label}
            label={p.label}
            hue={p.hue}
            paints={p.paints}
            ownedIds={ownedIds}
          />
        ))}
      </div>
    </div>
  )
}
```

### Step 6 — `SchemeOverview` orchestrator

**`src/modules/color-schemes/components/scheme-overview.tsx`** — `'use client'` (owns slider state).

```tsx
'use client'

import { useMemo, useState } from 'react'

import { SchemeOverviewBlock } from '@/modules/color-schemes/components/scheme-overview-block'
import { getSchemePartners } from '@/modules/color-schemes/utils/get-scheme-partners'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Renders all five color schemes at once for a known base color, with value-scale
 * paint matches per partner color.
 *
 * Unlike {@link SchemeDisplay}, this component:
 *   - has no scheme-type selector (every scheme is shown),
 *   - hides the base/root color (the calling page is already about that color),
 *   - renders catalog paint chips only (no derived swatches),
 *   - omits the save-as-palette action.
 *
 * @param props.baseColor - The implicit root color (e.g. the paint the user is viewing).
 * @param props.paints - Catalog paints used by the value-scale matcher.
 * @param props.ownedIds - Set of paint IDs in the user's collection. Forwarded to chips for owned-state styling.
 */
export function SchemeOverview({
  baseColor,
  paints,
  ownedIds,
}: {
  baseColor: BaseColor
  paints: ColorWheelPaint[]
  ownedIds: Set<string>
}) {
  const [analogousAngle, setAnalogousAngle] = useState(30)

  const complementary = useMemo(
    () => getSchemePartners(baseColor, 'complementary', paints),
    [baseColor, paints],
  )
  const split = useMemo(
    () => getSchemePartners(baseColor, 'split-complementary', paints),
    [baseColor, paints],
  )
  const analogous = useMemo(
    () => getSchemePartners(baseColor, 'analogous', paints, analogousAngle),
    [baseColor, paints, analogousAngle],
  )
  const triadic = useMemo(
    () => getSchemePartners(baseColor, 'triadic', paints),
    [baseColor, paints],
  )
  const tetradic = useMemo(
    () => getSchemePartners(baseColor, 'tetradic', paints),
    [baseColor, paints],
  )

  return (
    <div className="flex flex-col gap-4">
      <SchemeOverviewBlock title="Complementary" partners={complementary} ownedIds={ownedIds} />
      <SchemeOverviewBlock title="Split-Complementary" partners={split} ownedIds={ownedIds} />
      <SchemeOverviewBlock
        title="Analogous"
        partners={analogous}
        ownedIds={ownedIds}
        control={
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Spread {analogousAngle}°
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={analogousAngle}
              onChange={(e) => setAnalogousAngle(Number(e.target.value))}
              className="w-32"
              aria-label="Analogous spread angle"
            />
          </label>
        }
      />
      <SchemeOverviewBlock title="Triadic" partners={triadic} ownedIds={ownedIds} />
      <SchemeOverviewBlock title="Tetradic" partners={tetradic} ownedIds={ownedIds} />
    </div>
  )
}
```

### Step 7 — Modify `paint-color-schemes-section.tsx`

Replace the inner `<SchemeDisplay ... />` with `<SchemeOverview ... />`. The `paint`, `paints`, and `collectionPaintIds` props on the section are unchanged. `isAuthenticated` is no longer needed (the new layout doesn't render auth-gated controls), so drop it from the section's props **and** from `paint-detail.tsx`'s call site.

```tsx
'use client'

import { useMemo } from 'react'

import { SchemeOverview } from '@/modules/color-schemes/components/scheme-overview'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

export function PaintColorSchemesSection({
  paint,
  paints,
  collectionPaintIds,
}: {
  paint: { id: string; name: string; hue: number; saturation: number; lightness: number; hex: string }
  paints: ColorWheelPaint[]
  collectionPaintIds: string[]
}) {
  const baseColor = useMemo<BaseColor>(
    () => ({
      hue: paint.hue,
      saturation: paint.saturation,
      lightness: paint.lightness,
      hex: paint.hex,
      name: paint.name,
    }),
    [paint.hue, paint.saturation, paint.lightness, paint.hex, paint.name],
  )

  const ownedIds = useMemo(() => new Set(collectionPaintIds), [collectionPaintIds])

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Color schemes</h2>
        <p className="text-sm text-muted-foreground">
          Complementary, analogous, triadic, and tetradic harmonies of {paint.name}, matched to catalog paints.
        </p>
      </header>
      <SchemeOverview baseColor={baseColor} paints={paints} ownedIds={ownedIds} />
    </section>
  )
}
```

Also remove the now-unused `isAuthenticated` prop from `paint-detail.tsx`'s call site to `PaintColorSchemesSection`. Leave the prop on `PaintDetail` itself — it is still used by `PaintSimilarSection` and others.

### Step 8 — Manual verification

- Open `/paints/[id]` for a saturated paint. All five scheme blocks render. No root/base color is shown.
- Each partner row renders five chips, ordered light→dark, with the center chip ringed.
- The analogous block's slider updates only the two analogous rows. Other blocks are stable.
- A chip in your collection shows the small owned-state dot. Other chips do not.
- Clicking a chip navigates to the corresponding paint detail page.
- Discontinued paint: section still renders.
- Paint near the catalog's extremes (very light or very dark) still produces five chips per row (fallback widens the candidate pool).
- `npm run build` and `npm run lint` are clean.

## Layout Mockup (ASCII)

```
┌── Color schemes ──────────────────────────────────────────────────────────────┐
│  Complementary, analogous, triadic, and tetradic harmonies of {paint.name},    │
│  matched to catalog paints.                                                    │
├─ Complementary ───────────────────────────────────────────────────────────────┤
│  Complement                                                          187°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
│   light          canonical          dark                                       │
├─ Split-Complementary ─────────────────────────────────────────────────────────┤
│  Split 1                                                             157°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
│  Split 2                                                             217°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
├─ Analogous            Spread 30°  ────────────────────────────────────────────┤
│  Analogous −30°                                                      337°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
│  Analogous +30°                                                      37°       │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
├─ Triadic ─────────────────────────────────────────────────────────────────────┤
│  Triad 1                                                             127°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
│  Triad 2                                                             247°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
├─ Tetradic ────────────────────────────────────────────────────────────────────┤
│  Tetrad 1                                                            97°       │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
│  Complement                                                          187°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
│  Tetrad 3                                                            277°      │
│  [ ▢ ] [ ▢ ] [▣] [ ▢ ] [ ▢ ]                                                  │
└────────────────────────────────────────────────────────────────────────────────┘

▣ = canonical (closest-hue) match, rendered with a subtle ring.
Each chip: color swatch + paint name + brand + hex (links to /paints/[paint id]).
A small owned-state dot appears on chips in the user's collection.
```

Total visible chips per page: 10 partner rows × 5 chips = **50** catalog paints, all link-clickable to their detail pages.

## Notes

- **Why no scheme selector?** On the paint detail page, the goal is informational — "what could I pair with this paint?" — not exploratory. Stacking all five schemes avoids gating each one behind a click, and the density is acceptable because each row is a fixed five-chip strip rather than the larger swatches used by `SchemeDisplay`.
- **Why no root color?** The root *is* the paint the user is viewing. The hex/HSL/hue classification block at the top of the paint detail page already describes it. Re-rendering it under each scheme would be redundant.
- **Why drop save-as-palette?** Saving a palette only makes sense once the user has narrowed to one scheme. That workflow is preserved on `/schemes`. Adding five separate save buttons here (one per scheme) would clutter the page; adding one would be ambiguous about which scheme to save.
- **Why drop inline collection toggles?** The chip-as-link makes the navigate-to-paint flow obvious; the small owned-dot lets the user see ownership without acting on it. If user feedback later asks for inline toggles, swap the dot for a `CollectionPaintCard`-style heart and reintroduce `revalidatePath` plumbing — the data is already available.
- **Why value-scale ordering?** Painters routinely think in light→dark mid-tones rather than pure hue. Centering on the canonical match and bracketing it with two lighter and two darker neighbours mirrors how a painter would lay out a value scale on a palette — and gives them five usable picks per partner color at a glance.
- **`circularHueDistance` extraction**: if the helper is currently private inside `find-nearest-paints.ts`, lift it into a new file `src/modules/color-schemes/utils/circular-hue-distance.ts` and import it from both matchers. This keeps the file-per-export rule clean and avoids duplicating the implementation.
- No automated tests — follow the manual QA list in Step 8 (`CLAUDE.md`: no test framework in this project).
