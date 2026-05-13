# Scheme Explorer Refactor — Hooks, Services, and Reusable Components

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Completed
**Branch:** `feature/scheme-explorer-refactor`
**Merge into:** `epic/color-schema-explorer`

## Summary

Extract the orchestration logic currently inlined in `scheme-explorer.tsx` into a dedicated `useColorScheme` hook, and split the scheme type selector + swatch grid + save-as-palette button into a single self-contained reusable display component. The goal is purely structural: the `/schemes` page must look and behave identically afterward, but the same scheme-generation + nearest-paint UI becomes embeddable elsewhere (specifically, the paint details page in feature 05) without duplicating logic.

This is a prep refactor — no new user-facing behavior — that unblocks feature 05 (`paint-details-color-schemes`).

## Acceptance Criteria

- [ ] A new hook `src/modules/color-schemes/hooks/use-color-scheme.ts` is created. It accepts `{ baseColor, paints, initialScheme?, initialAnalogousAngle? }` and returns `{ schemeColors, activeScheme, setActiveScheme, analogousAngle, setAnalogousAngle }`.
- [ ] The hook contains all the `useMemo` and `useState` previously inlined in `scheme-explorer.tsx` for scheme type, analogous spread, and the derived `schemeColors` (with nearest paints filled in).
- [ ] The hook does **not** import or depend on `BaseColorPicker` — `baseColor: BaseColor | null` is passed in, so the hook is reusable wherever the base color comes from.
- [ ] A new reusable display component is created (e.g. `src/modules/color-schemes/components/scheme-display.tsx`) that accepts `{ baseColor, paints, isAuthenticated, ownedIds, revalidatePath? }` and renders the scheme type selector + swatch grid + save-as-palette button. It uses `useColorScheme` internally.
- [ ] The display component is consumable on the `/schemes` page **and** on the paint details page (feature 05) without modification.
- [ ] `scheme-explorer.tsx` becomes thin: it owns only the `baseColor` state (driven by `BaseColorPicker`), composes `BaseColorPicker` + the new display component, and renders the "Select a base color" empty-state card.
- [ ] Any non-trivial pure logic extracted from the orchestration lives under `utils/`. If a piece of logic needs server-side data access (not expected for this refactor — `paints` is passed in as a prop), it lives under a new `services/` directory in the module.
- [ ] The `revalidatePath` value passed to `CollectionPaintCard` inside `SchemeSwatch` becomes a prop on the display component (default `'/schemes'`), so callers on other routes (`/paints/[id]`) can override it.
- [ ] `/schemes` renders pixel-for-pixel the same as before — base color picker, scheme type tabs, analogous slider, swatch grid, save-as-palette button, and empty state are all visually and functionally unchanged.
- [ ] All exports include JSDoc per `CLAUDE.md` (hook, component, props types).
- [ ] No barrel/index re-exports are introduced.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Dependencies

- None — this is a self-contained refactor of the existing `color-schemes` module.

## Domain Module

Lives in `src/modules/color-schemes/`. No new module.

After this refactor, the module structure is:

```
src/modules/color-schemes/
├── components/
│   ├── base-color-picker.tsx
│   ├── save-scheme-as-palette-button.tsx
│   ├── scheme-display.tsx           # NEW — reusable selector + grid + save button
│   ├── scheme-explorer.tsx          # MODIFIED — now thin
│   ├── scheme-paint-combobox.tsx
│   ├── scheme-swatch-grid.tsx
│   ├── scheme-swatch.tsx
│   └── scheme-type-selector.tsx
├── hooks/
│   └── use-color-scheme.ts          # NEW
├── types/
│   ├── base-color.ts
│   └── scheme-color.ts
└── utils/
    ├── build-palette-from-scheme.ts
    ├── find-nearest-paints.ts
    └── generate-scheme.ts
```

## Routes

| Route      | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `/schemes` | Color scheme explorer page — behavior unchanged after this refactor. |

## Key Files

| Action | File                                                              | Description                                                                                              |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Create | `src/modules/color-schemes/hooks/use-color-scheme.ts`             | New hook — owns `activeScheme`, `analogousAngle`, and the memoized `schemeColors` derivation.            |
| Create | `src/modules/color-schemes/components/scheme-display.tsx`         | New reusable component — renders selector + swatch grid + save-as-palette button using `useColorScheme`. |
| Modify | `src/modules/color-schemes/components/scheme-explorer.tsx`        | Strip orchestration logic; keep only `baseColor` state, `BaseColorPicker`, the new display, and the empty-state card. |
| Modify | `src/modules/color-schemes/components/scheme-swatch-grid.tsx`     | Accept an optional `revalidatePath` prop and forward to `SchemeSwatch`.                                  |
| Modify | `src/modules/color-schemes/components/scheme-swatch.tsx`          | Accept `revalidatePath` (default `'/schemes'`) and pass it to `CollectionPaintCard`.                     |

## Existing Building Blocks (Reuse)

| Building block                       | Path                                                                | Use in this refactor                                                                 |
| ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `generateScheme`                     | `src/modules/color-schemes/utils/generate-scheme.ts`                | Called from inside the new hook — unchanged.                                         |
| `findNearestPaints`                  | `src/modules/color-schemes/utils/find-nearest-paints.ts`            | Called from inside the new hook — unchanged.                                         |
| `BaseColorPicker`                    | `src/modules/color-schemes/components/base-color-picker.tsx`        | Stays mounted by `scheme-explorer.tsx` — unchanged.                                  |
| `SchemeTypeSelector`                 | `src/modules/color-schemes/components/scheme-type-selector.tsx`     | Moves into `scheme-display.tsx`.                                                     |
| `SchemeSwatchGrid` / `SchemeSwatch`  | `src/modules/color-schemes/components/scheme-swatch{-grid,}.tsx`    | Moves into `scheme-display.tsx`; `revalidatePath` becomes a prop instead of a hardcoded literal. |
| `SaveSchemeAsPaletteButton`          | `src/modules/color-schemes/components/save-scheme-as-palette-button.tsx` | Moves into `scheme-display.tsx`; no internal changes.                                |

## Implementation

### Step 1 — Create `useColorScheme` hook

**`src/modules/color-schemes/hooks/use-color-scheme.ts`**

```ts
'use client'

import { useMemo, useState } from 'react'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'
import { generateScheme } from '@/modules/color-schemes/utils/generate-scheme'
import { findNearestPaints } from '@/modules/color-schemes/utils/find-nearest-paints'

export function useColorScheme({
  baseColor,
  paints,
  initialScheme = 'complementary',
  initialAnalogousAngle = 30,
}: {
  baseColor: BaseColor | null
  paints: ColorWheelPaint[]
  initialScheme?: ColorScheme
  initialAnalogousAngle?: number
}) {
  const [activeScheme, setActiveScheme] = useState<ColorScheme>(initialScheme)
  const [analogousAngle, setAnalogousAngle] = useState(initialAnalogousAngle)

  const schemeColors = useMemo<SchemeColor[]>(() => {
    if (!baseColor) return []
    return generateScheme(baseColor, activeScheme, analogousAngle).map((color) => ({
      ...color,
      nearestPaints: findNearestPaints(color.hue, paints),
    }))
  }, [baseColor, activeScheme, analogousAngle, paints])

  return { schemeColors, activeScheme, setActiveScheme, analogousAngle, setAnalogousAngle }
}
```

- JSDoc the hook with a summary, `@param` for each option, and `@returns` describing the shape.
- The hook is decoupled from `BaseColorPicker` — `baseColor` is just a value.

### Step 2 — Create `scheme-display.tsx`

**`src/modules/color-schemes/components/scheme-display.tsx`**

```tsx
'use client'

import { SchemeTypeSelector } from '@/modules/color-schemes/components/scheme-type-selector'
import { SchemeSwatchGrid } from '@/modules/color-schemes/components/scheme-swatch-grid'
import { SaveSchemeAsPaletteButton } from '@/modules/color-schemes/components/save-scheme-as-palette-button'
import { useColorScheme } from '@/modules/color-schemes/hooks/use-color-scheme'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

export function SchemeDisplay({
  baseColor,
  paints,
  isAuthenticated,
  ownedIds,
  revalidatePath = '/schemes',
}: {
  baseColor: BaseColor
  paints: ColorWheelPaint[]
  isAuthenticated: boolean
  ownedIds: Set<string>
  revalidatePath?: string
}) {
  const {
    schemeColors,
    activeScheme,
    setActiveScheme,
    analogousAngle,
    setAnalogousAngle,
  } = useColorScheme({ baseColor, paints })

  return (
    <div className="flex flex-col gap-6">
      <SchemeTypeSelector
        value={activeScheme}
        onChange={setActiveScheme}
        analogousAngle={analogousAngle}
        onAnalogousAngleChange={setAnalogousAngle}
      />
      <div className="flex justify-end">
        <SaveSchemeAsPaletteButton
          schemeColors={schemeColors}
          baseColor={baseColor}
          activeScheme={activeScheme}
        />
      </div>
      <SchemeSwatchGrid
        colors={schemeColors}
        isAuthenticated={isAuthenticated}
        ownedIds={ownedIds}
        revalidatePath={revalidatePath}
      />
    </div>
  )
}
```

- `baseColor` is non-null here — callers (like `scheme-explorer.tsx`) guard before mounting this component.
- The component takes no display state of its own; everything lives in the hook.
- JSDoc each prop.

### Step 3 — Thread `revalidatePath` through swatch components

**`src/modules/color-schemes/components/scheme-swatch-grid.tsx`** — add `revalidatePath?: string` to props, forward to `SchemeSwatch`.

**`src/modules/color-schemes/components/scheme-swatch.tsx`** — add `revalidatePath?: string` (default `'/schemes'`) and pass to `CollectionPaintCard` instead of the current hardcoded `revalidatePath="/schemes"`.

This is what unblocks reuse on `/paints/[id]` — the paint details page will pass `revalidatePath={`/paints/${paint.id}`}` (feature 05).

### Step 4 — Slim down `scheme-explorer.tsx`

**`src/modules/color-schemes/components/scheme-explorer.tsx`** becomes:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BaseColorPicker } from '@/modules/color-schemes/components/base-color-picker'
import { SchemeDisplay } from '@/modules/color-schemes/components/scheme-display'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

export function SchemeExplorer({
  paints,
  isAuthenticated,
  collectionPaintIds,
}: {
  paints: ColorWheelPaint[]
  isAuthenticated: boolean
  collectionPaintIds: string[]
}) {
  const [baseColor, setBaseColor] = useState<BaseColor | null>(null)
  const ownedIds = useMemo(() => new Set(collectionPaintIds), [collectionPaintIds])

  return (
    <section className="flex flex-col gap-6">
      <BaseColorPicker paints={paints} onChange={setBaseColor} />

      {baseColor ? (
        <SchemeDisplay
          baseColor={baseColor}
          paints={paints}
          isAuthenticated={isAuthenticated}
          ownedIds={ownedIds}
          revalidatePath="/schemes"
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">Select a base color to generate a scheme.</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
```

### Step 5 — Verify parity on `/schemes`

- Run `npm run build` and `npm run lint`.
- Manually exercise `/schemes`:
  - Pick a base color via paint search — selector + grid + save button appear.
  - Pick a base color via custom hex — same.
  - Switch scheme types (complementary → split-complementary → analogous → triadic → tetradic).
  - Drag the analogous spread slider; swatches update.
  - Toggle a paint's collection membership — confirm the same revalidation behavior as before.
  - Save as palette — confirm the redirect flow still works.
  - Reload while signed out — empty-state card renders and base picker still works.

## Notes

- This refactor is intentionally narrow. Do **not** rename existing types, change the `BaseColor` shape, or touch `generate-scheme.ts` / `find-nearest-paints.ts` — they are reused as-is by the hook.
- The hook must remain **transport-agnostic**: it accepts a `BaseColor` and a `ColorWheelPaint[]`, full stop. It must not couple to `BaseColorPicker`, route-page data fetching, or auth state. That decoupling is what lets feature 05 (`paint-details-color-schemes`) feed a paint's own HSL into the hook with no picker UI.
- `SchemeDisplay` is the natural public entry point for embedding scheme exploration anywhere in the app. If a future caller needs the swatch grid without the type selector or save button, lift the hook directly and compose the sub-components yourself — do not add toggle props to `SchemeDisplay` to hide pieces. Keep the component opinionated.
- No `services/` directory is created by this refactor — all current logic is pure or UI-bound. If a follow-up needs server-side scheme persistence (e.g. saving and re-loading a scheme on profile pages), a `services/` directory should be added at that point.
- This refactor is a prerequisite for `05-paint-details-color-schemes.md`. Land this PR first, then build the paint-details integration on top of `useColorScheme` + `SchemeDisplay`.
