# Paint Details Color Schemes Section

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Todo
**Branch:** `feature/paint-details-color-schemes`
**Merge into:** `main`

## Summary

Add a "Color Schemes" section to the paint details page (`/paints/[id]`) that shows complementary, split-complementary, analogous, triadic, and tetradic variations derived from the paint's own HSL values, with nearest-paint matches per variation. The paint itself becomes the implicit base color — there is no base-color picker on this page — and all rendering reuses the `useColorScheme` hook + `SchemeDisplay` component built in feature `04-scheme-explorer-refactor`.

In short: same logic as `/schemes`, same UI, no duplication — just sourced from the paint instead of a picker.

## Acceptance Criteria

- [ ] A new section component `src/modules/paints/components/paint-color-schemes-section.tsx` is created in the `paints` module.
- [ ] The section converts the source paint's `{ hue, saturation, lightness, hex, name }` into a `BaseColor` and renders `<SchemeDisplay ... />` from `@/modules/color-schemes/components/scheme-display`.
- [ ] The scheme type selector defaults to `'complementary'` (matching `/schemes`); the user can switch between complementary, split-complementary, analogous, triadic, and tetradic.
- [ ] When `analogous` is selected, the spread slider works exactly as on `/schemes`.
- [ ] Each scheme color renders its hex + hue and up to five nearest-paint matches via `CollectionPaintCard` (the existing `SchemeSwatch` behavior).
- [ ] Nearest-paint collection toggles use `revalidatePath={`/paints/${paint.id}`}` so toggling a paint's collection membership inside the schemes section revalidates the current paint detail page (not `/schemes`).
- [ ] The section renders on `/paints/[id]` for **every** paint (discontinued or not), placed after the existing hue classification block and **before** `PaintSimilarSection`. See "Placement" below for the rationale.
- [ ] The route page (`src/app/paints/[id]/page.tsx`) fetches the full `getColorWheelPaints()` list in parallel with the existing data and passes it to `PaintDetail`, which forwards it to the new section.
- [ ] The "Save as palette" button continues to work — it is rendered by `SchemeDisplay`, so no extra wiring is needed in the `paints` module.
- [ ] The section is auth-aware: signed-in users see collection toggles on each nearest paint card; signed-out users see read-only cards. The existing `isAuthenticated` and `collectionPaintIds` plumbing on the route page is extended to feed this section.
- [ ] All exports include JSDoc per `CLAUDE.md`.
- [ ] No barrel/index re-exports are introduced.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Dependencies

- **Requires `04-scheme-explorer-refactor`** to be merged first. This feature consumes `useColorScheme` and `SchemeDisplay`, which only exist after that refactor lands. Do not start this feature until feature 04 is merged into `main`.

## Domain Module

Primary module: `src/modules/paints/` (new section component).

Consumed (no changes expected): `src/modules/color-schemes/` — the hook and display component built in feature 04 must work as-is. If a defect surfaces in the color-schemes module during integration, fix it in feature 04 follow-up work, not here.

Touched data sources: `src/modules/paints/services/paint-service.ts` (`getColorWheelPaints`) and `src/modules/collection/services/collection-service.server.ts` (`getUserPaintIds`) — both already exist; no new service code is required.

## Routes

| Route          | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `/paints/[id]` | Paint detail page — gains a new "Color Schemes" section (modify). |

## Key Files

| Action | File                                                                     | Description                                                                                                          |
| ------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Create | `src/modules/paints/components/paint-color-schemes-section.tsx`          | New section component — builds a `BaseColor` from the paint and renders `<SchemeDisplay ... />`.                     |
| Modify | `src/modules/paints/components/paint-detail.tsx`                         | Render `<PaintColorSchemesSection ... />` between the hue classification block and `PaintSimilarSection`. Accept new `paints`, `collectionPaintIds` props. |
| Modify | `src/app/paints/[id]/page.tsx`                                           | Fetch `paintService.getColorWheelPaints()` and (for authed users) `collectionService.getUserPaintIds(user.id)` in parallel with existing data; forward to `PaintDetail`. |

## Existing Building Blocks (Reuse)

| Building block                | Path                                                                  | Use in this feature                                                            |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `useColorScheme`              | `src/modules/color-schemes/hooks/use-color-scheme.ts` (feature 04)    | Drives scheme type, analogous spread, and derived swatches. Used inside `SchemeDisplay`. |
| `SchemeDisplay`               | `src/modules/color-schemes/components/scheme-display.tsx` (feature 04) | Renders the entire scheme UI (selector + swatch grid + save-as-palette).       |
| `BaseColor`                   | `src/modules/color-schemes/types/base-color.ts`                       | Shape constructed from the paint's HSL fields.                                 |
| `getColorWheelPaints`         | `src/modules/paints/services/paint-service.ts`                        | Provides the catalog used by `findNearestPaints` inside the hook.              |
| `getUserPaintIds`             | `src/modules/collection/services/collection-service.server.ts`        | Powers the `ownedIds` set passed into `SchemeDisplay`.                         |
| `CollectionPaintCard`         | `src/modules/collection/components/collection-paint-card.tsx`         | Already used by `SchemeSwatch` — the new `revalidatePath` prop (feature 04) is what makes this reusable here. |

## Implementation

### Step 1 — Create the section component

**`src/modules/paints/components/paint-color-schemes-section.tsx`** — `'use client'`:

```tsx
'use client'

import { useMemo } from 'react'
import { SchemeDisplay } from '@/modules/color-schemes/components/scheme-display'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

export function PaintColorSchemesSection({
  paint,
  paints,
  isAuthenticated,
  collectionPaintIds,
}: {
  paint: {
    id: string
    name: string
    hue: number
    saturation: number
    lightness: number
    hex: string
  }
  paints: ColorWheelPaint[]
  isAuthenticated: boolean
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
          Variations and harmonies derived from {paint.name}, matched to paints in the catalog.
        </p>
      </header>
      <SchemeDisplay
        baseColor={baseColor}
        paints={paints}
        isAuthenticated={isAuthenticated}
        ownedIds={ownedIds}
        revalidatePath={`/paints/${paint.id}`}
      />
    </section>
  )
}
```

- The component is intentionally thin: it only constructs the `BaseColor` and the `ownedIds` set, then defers to `SchemeDisplay`.
- The `paint` prop type is widened to just the fields actually needed (HSL/hex/name/id), not the full `PaintWithRelationsAndHue`. This keeps the section trivially testable and avoids a circular dependency on the heavier paint type.
- JSDoc the component and each prop.

### Step 2 — Wire into `PaintDetail`

**`src/modules/paints/components/paint-detail.tsx`** — add two new props and render the section:

- Add to props:
  - `paints: ColorWheelPaint[]` — full color-wheel paint list for nearest-paint matching.
  - `collectionPaintIds: string[]` — IDs of paints in the current user's collection (empty array for anonymous users).
- After the existing hue classification block (the closing `{subHue && ...}` div) and **before** `<PaintSimilarSection ... />`, render:

  ```tsx
  <PaintColorSchemesSection
    paint={{
      id: paint.id,
      name: paint.name,
      hue: paint.hue,
      saturation: paint.saturation,
      lightness: paint.lightness,
      hex: paint.hex,
    }}
    paints={paints}
    isAuthenticated={isAuthenticated}
    collectionPaintIds={collectionPaintIds}
  />
  ```

- JSDoc the new props.

### Step 3 — Wire the route page

**`src/app/paints/[id]/page.tsx`** — extend the existing `Promise.all` block:

- Add `paintService.getColorWheelPaints()` to the parallel fetch.
- Add `user ? (await getCollectionService()).getUserPaintIds(user.id) : new Set<string>()` to the parallel fetch (or reuse the existing pattern from `src/app/schemes/page.tsx`, which spreads the returned set into an array). Normalize to a plain `string[]` before passing to `PaintDetail` to keep the prop serializable across the Server/Client boundary.
- Forward both new values to `<PaintDetail ... paints={paints} collectionPaintIds={collectionPaintIds} />`.

### Step 4 — Manual verification

- Open `/paints/[id]` for a paint with strong hue saturation (e.g. a saturated red or blue) — the schemes section renders, defaulting to complementary, with two swatches and matched nearest paints.
- Switch through each scheme type — the swatch count and labels update.
- Drag the analogous spread slider — swatches update without a flicker.
- Sign in, toggle a paint into your collection from inside a nearest-paint card — the heart/badge updates and the page revalidates (no stale UI).
- Click "Save as palette" — the dialog opens, pre-fills a name (e.g. "Complementary of {paint name}"), saving redirects to the new palette page.
- Open the page signed-out — collection toggles render as read-only / sign-in prompts (matching existing `CollectionPaintCard` behavior); save-as-palette is disabled/redirects to sign-in (matching `/schemes` behavior).
- Open a discontinued paint — schemes section, similar paints section, and substitutes section all render and remain readable.

## Placement

The section is rendered **after the hue classification block** and **before `PaintSimilarSection`**. The reasoning:

1. The hex/RGB/HSL grid and hue classification are the paint's *identity*. They stay at the top.
2. Color schemes are a *creative/inspirational* tool — they expand from the paint into related colors. They sit naturally above the cross-brand "Similar Paints" engine, which is a *substitution* tool. Inspirational → substitution is a more intuitive top-to-bottom flow than the inverse.
3. The `PaintSubstitutes` block (discontinued-only) continues to render last, after `PaintSimilarSection`. This feature does not touch that block.

If usability feedback after launch suggests the schemes section is too prominent (or too buried), the placement can be flipped with a single edit in `paint-detail.tsx`.

## Notes

- The paint is the **implicit** base color. Do not render `BaseColorPicker` on this page — the picker is intentionally omitted because the route already has a paint in hand. If a user wants to pick a different base, they have `/schemes` for that.
- The "Save as palette" button continues to work because `SchemeDisplay` mounts `SaveSchemeAsPaletteButton` itself. No paint-detail-specific override is needed. The default palette name (built by `buildPaletteFromScheme`) already incorporates the base color's `name`, which is the paint name here — so saved palettes will read e.g. "Complementary of Mephiston Red" out of the box.
- Collection toggle plumbing on the nearest-paint cards relies on `revalidatePath` being a valid Next.js route. We pass the current paint's detail route so toggling collection state revalidates the page the user is actually on. Without this, toggles would only revalidate `/schemes` (the feature-04 default), which would leave the current page's collection badges stale.
- The `paints: ColorWheelPaint[]` prop on `PaintDetail` is a non-trivial payload. It is the same payload `/schemes` ships today, so the bandwidth cost is in line with an existing precedent. If page weight becomes a concern, the section can be deferred into its own client-fetched component via a server action — track that as a follow-up, not a blocker for v1.
- This feature deliberately does **not** introduce a new module, a new service, or new types. All scheme logic lives in `color-schemes`; the only new code in `paints` is one section component that adapts a paint into a `BaseColor` and forwards to the reusable display. That tightness is the whole point of feature 04's refactor.
- No automated tests — follow the manual QA list in Step 4 (`CLAUDE.md`: no test framework in this project).
