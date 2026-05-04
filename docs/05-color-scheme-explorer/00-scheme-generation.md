# Color Scheme Generation

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Done
**Branch:** `feature/scheme-generation`
**Merge into:** `v1/main`

## Summary

Provide tools for generating color schemes (complementary, split-complementary, analogous, triadic, tetradic) from a selected base color or paint, helping painters make intentional, harmonious color choices.

## Acceptance Criteria

- [x] Users can select a base color (via paint picker or manual hex/hue input)
- [x] The app generates complementary, split-complementary, analogous, triadic, and tetradic schemes
- [x] Each scheme type is selectable via tabs or toggles
- [x] Generated scheme colors are displayed as swatches with their hue/hex values
- [x] Users can adjust scheme parameters (e.g., analogous angle spread)
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route      | Description                |
| ---------- | -------------------------- |
| `/schemes` | Color scheme explorer page |

## Module

New module: `src/modules/color-schemes/`

```
src/modules/color-schemes/
├── components/
│   ├── base-color-picker.tsx     # Paint search + hex input
│   ├── scheme-explorer.tsx       # Main client component
│   ├── scheme-swatch.tsx         # Single scheme color card
│   ├── scheme-swatch-grid.tsx    # Row of swatches
│   └── scheme-type-selector.tsx  # Tabs + analogous angle slider
├── types/
│   ├── base-color.ts             # BaseColor type
│   └── scheme-color.ts           # SchemeColor type (computed output)
└── utils/
    ├── find-nearest-paints.ts    # Hue-proximity paint matcher
    └── generate-scheme.ts        # Pure scheme generation
```

## Key Files

| Action | File                                                         | Description                               |
| ------ | ------------------------------------------------------------ | ----------------------------------------- |
| Create | `src/app/schemes/page.tsx`                                   | Scheme explorer route page (server)       |
| Create | `src/modules/color-schemes/types/base-color.ts`             | BaseColor type                            |
| Create | `src/modules/color-schemes/types/scheme-color.ts`           | SchemeColor type                          |
| Create | `src/modules/color-schemes/utils/generate-scheme.ts`        | Scheme generation (angle math + hex)      |
| Create | `src/modules/color-schemes/utils/find-nearest-paints.ts`    | Hue-proximity paint matcher               |
| Create | `src/modules/color-schemes/components/base-color-picker.tsx`| Base color picker (paint search + hex)    |
| Create | `src/modules/color-schemes/components/scheme-type-selector.tsx` | Scheme type tabs + analogous slider   |
| Create | `src/modules/color-schemes/components/scheme-swatch.tsx`    | Single scheme color card                  |
| Create | `src/modules/color-schemes/components/scheme-swatch-grid.tsx` | Row of scheme swatches                  |
| Create | `src/modules/color-schemes/components/scheme-explorer.tsx`  | Main client container component           |

## Implementation

### Step 1 — Define types

**`src/modules/color-schemes/types/base-color.ts`**

```ts
/** A selected base color for scheme generation, sourced from a paint or a custom hex input. */
export type BaseColor = {
  hue: number          // 0–360
  saturation: number   // 0–100
  lightness: number    // 0–100
  hex: string          // '#RRGGBB'
  name?: string        // Paint name if selected from database; absent for custom hex
}
```

**`src/modules/color-schemes/types/scheme-color.ts`**

```ts
/** A single computed color in a generated scheme, with its nearest matching paints. */
export type SchemeColor = {
  hue: number
  saturation: number
  lightness: number
  hex: string
  label: string              // e.g. 'Base', 'Complement', 'Triad 1', 'Analogous −30°'
  nearestPaints: ColorWheelPaint[]
}
```

### Step 2 — Scheme generation utility

**`src/modules/color-schemes/utils/generate-scheme.ts`**

Pure function: `generateScheme(base: BaseColor, scheme: ColorScheme, analogousAngle?: number): SchemeColor[]`

- `analogousAngle` defaults to 30, valid range 15–60 (only used for `'analogous'`)
- Inherits base saturation and lightness for all partner colors
- Angle offsets (same as `getSchemeWedges` but return full color, not wedge):

  | Scheme              | Hue offsets from base          | Labels                               |
  | ------------------- | ------------------------------ | ------------------------------------ |
  | complementary       | 0, +180                        | Base, Complement                     |
  | split-complementary | 0, +150, +210                  | Base, Split 1, Split 2               |
  | analogous           | −angle, 0, +angle              | Analogous −N°, Base, Analogous +N°   |
  | triadic             | 0, +120, +240                  | Base, Triad 1, Triad 2               |
  | tetradic            | 0, +90, +180, +270             | Base, Tetrad 1, Complement, Tetrad 3 |

- Normalize all hues with `((h % 360) + 360) % 360`
- Compute hex via `hslToHex(hue, saturation / 100, lightness / 100)` (imported from `color-wheel/utils/hsl-to-hex`)
- `nearestPaints` is left as `[]` here — filled by the caller using `findNearestPaints`

### Step 3 — Nearest paints utility

**`src/modules/color-schemes/utils/find-nearest-paints.ts`**

`findNearestPaints(targetHue: number, paints: ColorWheelPaint[], limit = 5): ColorWheelPaint[]`

- Circular hue distance: `Math.min(Math.abs(a - b), 360 - Math.abs(a - b))`
- Sort paints ascending by that distance
- Return the first `limit` results
- Does **not** require a full color-distance engine — hue proximity is sufficient for v1

### Step 4 — Base color picker

**`src/modules/color-schemes/components/base-color-picker.tsx`**

Client component. Props:

```ts
{
  paints: ColorWheelPaint[]
  value: BaseColor | null
  onChange: (color: BaseColor) => void
}
```

Two modes toggled by a button group: **"Search Paints"** | **"Custom Color"**

- **Search mode**: controlled text input; filter `paints` by substring on `name` (case-insensitive); render a dropdown list (max 8 results) with a color swatch and paint name per row; selecting a row emits `BaseColor` from the paint's `hue`, `saturation`, `lightness`, `hex`, `name`
- **Custom mode**: `<input type="text" placeholder="#RRGGBB" />`; validate with a 6-digit hex regex; on valid input call `hexToHsl(hex)` (from `@/modules/color-wheel/utils/hex-to-hsl`) — it returns `{ r, g, b, h, s, l }` where `h` is 0–360 and `s, l` are 0–100, so map directly into `BaseColor` as `{ hue: h, saturation: s, lightness: l, hex }` (no `name`); show live color swatch preview

### Step 5 — Scheme type selector

**`src/modules/color-schemes/components/scheme-type-selector.tsx`**

Client component. Props:

```ts
{
  value: ColorScheme
  onChange: (scheme: ColorScheme) => void
  analogousAngle: number
  onAnalogousAngleChange: (angle: number) => void
}
```

- Renders a 5-button tab strip — no dedicated tab primitive exists in `src/components/ui/`, so build it as a flex row of `Button` (or `.btn`) elements; apply `.btn-active` (or equivalent active styling) to the selected one
- When `value === 'analogous'`, renders a range slider below: native `<input type="range" min={15} max={60} step={1} />` (no slider primitive exists yet) styled with Tailwind classes; label "Spread: N°" derived from `analogousAngle`

### Step 6 — Scheme swatch

**`src/modules/color-schemes/components/scheme-swatch.tsx`**

Client component. Props: `{ color: SchemeColor }`

Layout per swatch:
1. Large square color block (`style={{ backgroundColor: color.hex }}`)
2. Label (e.g. "Base")
3. Hex value + hue angle (e.g. `#FF8C00  30°`)
4. Up to 5 nearest paint cards below — use existing `PaintCard` from `@/modules/paints/components/paint-card`. `PaintCard` props are `{ id, name, hex, brand?, paintType? }`, so map each `ColorWheelPaint` as `<PaintCard id={p.id} name={p.name} hex={p.hex} brand={p.brand_name} paintType={p.paint_type} />`

**`src/modules/color-schemes/components/scheme-swatch-grid.tsx`**

Props: `{ colors: SchemeColor[] }`

- Renders a responsive `flex` row of `SchemeSwatch` items
- Each swatch is equal-width; wraps on small screens

### Step 7 — Scheme explorer (main client component)

**`src/modules/color-schemes/components/scheme-explorer.tsx`**

```tsx
'use client'
```

Props: `{ paints: ColorWheelPaint[] }`

State:
- `baseColor: BaseColor | null`
- `activeScheme: ColorScheme` (default `'complementary'`)
- `analogousAngle: number` (default `30`)

Derived (via `useMemo`):
- `schemeColors: SchemeColor[]` — call `generateScheme(baseColor, activeScheme, analogousAngle)` then fill `nearestPaints` on each color via `findNearestPaints`

Layout:
```
<section>
  <BaseColorPicker ... />
  {baseColor && (
    <>
      <SchemeTypeSelector ... />
      <SchemeSwatchGrid colors={schemeColors} />
    </>
  )}
  {!baseColor && (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-muted-foreground">Select a base color to generate a scheme.</p>
      </CardContent>
    </Card>
  )}
</section>
```

### Step 8 — Route page

**`src/app/schemes/page.tsx`**

Server component:

```tsx
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { SchemeExplorer } from '@/modules/color-schemes/components/scheme-explorer'

export default async function SchemesPage() {
  const paintService = await getPaintService()
  const paints = await paintService.getColorWheelPaints()
  return (
    <main>
      <h1>Color Scheme Explorer</h1>
      <SchemeExplorer paints={paints} />
    </main>
  )
}
```

No authentication required.

## Notes

- `ColorScheme` type and `hslToHex` / `hexToHsl` utilities are imported from the existing `color-wheel` module — do not duplicate.
- `hslToHex` expects saturation and lightness as **0–1 fractions**; `BaseColor` stores them as **0–100 percentages**, so the call site must divide by 100 (`hslToHex(hue, saturation / 100, lightness / 100)`).
- Hue offsets in `generateScheme` must mirror those in `src/modules/color-wheel/utils/get-scheme-wedges.ts` so the wheel's overlay wedges and the explorer's swatch grid stay in sync. Treat `getSchemeWedges` as the source of truth for angles — if a future change adjusts wedge angles there, mirror it here.
- Scheme generation operates on hue only. Saturation and lightness are inherited from the base color but can be adjusted in a future iteration.
- Nearest-paint matching uses hue proximity only (v1). Full RGB color distance (for Cross-Brand Comparison) is not needed here.
- No `EmptyState` primitive exists in `src/components/ui/` yet — this plan uses an inline `Card` + `CardContent` pattern. If a shared `EmptyState` is introduced later, swap it in.
- This feature works without authentication — anyone can explore schemes.
