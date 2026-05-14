# Paint Detail Sections Toggle

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Done
**Branch:** `feature/paint-detail-sections-toggle`
**Merge into:** `main`

## Summary

Replace the stacked `PaintColorSchemesSection` + `PaintSimilarSection` layout on the paint detail page with a two-button side-by-side toggle that shows one section at a time. Default active panel is **Similar**. `PaintSubstitutes` (discontinued paints only) remains below the toggle and is unaffected.

## Acceptance Criteria

- [x] Two side-by-side toggle buttons — **Similar** and **Color Schemes** — appear above the panel area on every paint detail page.
- [x] The **Similar** tab is active by default on page load.
- [x] Clicking a button activates that tab; the previously active tab becomes inactive.
- [x] Only the active section is mounted (not CSS-hidden — the inactive component is not rendered).
- [x] Active button uses primary styling; inactive uses ghost styling (consistent with existing button patterns).
- [x] `PaintSubstitutes` continues to render below the toggle for discontinued paints and is not part of the toggle.
- [x] `paint-detail.tsx` remains a server component; the toggle is a client component.
- [x] No new UI library primitives (no Tabs component from shadcn/ui) — plain styled buttons only.
- [x] All exports have JSDoc per `CLAUDE.md`.
- [x] No barrel/index re-exports.
- [x] `npm run build` and `npm run lint` pass with no errors.

## Implementation

### Step 1 — Create `PaintSectionsToggle`

**`src/modules/paints/components/paint-sections-toggle.tsx`** — `'use client'`

Owns the active-tab state (`'similar' | 'schemes'`, defaulting to `'similar'`). Renders:
1. A `<div>` with two `<button>` elements side by side — **Similar** and **Color Schemes**.
2. The active section below the buttons.

Button styling mirrors the pagination pattern already in this module:
- Active: `btn btn-primary btn-sm`
- Inactive: `btn btn-ghost btn-sm`

Props: everything needed by both child sections (see Key Files table). `sourcePaintId` can be derived from `paint.id` inside the component rather than requiring a separate prop.

### Step 2 — Modify `paint-detail.tsx`

Remove the separate `<PaintColorSchemesSection>` and `<PaintSimilarSection>` calls. Replace them with a single `<PaintSectionsToggle>` call, passing all the combined props. No changes to the props signature of `PaintDetail` itself — the data is already threaded through.

### Step 3 — Verify

- Open `/paints/[id]` — Similar tab is active by default, similar paints grid loads.
- Click **Color Schemes** — schemes section mounts and renders; similar section is gone from the DOM.
- Click **Similar** again — schemes unmount, similar remounts (filter state resets — acceptable).
- Discontinued paint: `PaintSubstitutes` still appears below the toggle, unaffected.
- `npm run build` and `npm run lint` are clean.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `src/modules/paints/components/paint-sections-toggle.tsx` | Client component owning active-tab state; renders toggle buttons and active section |
| Modify | `src/modules/paints/components/paint-detail.tsx` | Replace two section calls with `<PaintSectionsToggle>` |

### `PaintSectionsToggle` props

| Prop | Type | Source in `PaintDetail` |
|------|------|-------------------------|
| `paint` | `{ id, name, hue, saturation, lightness, hex }` | `paint` (narrowed inline, same as current `PaintColorSchemesSection` call) |
| `paints` | `ColorWheelPaint[]` | `paints` |
| `collectionPaintIds` | `string[]` | `collectionPaintIds` |
| `sourceBrandId` | `string` | `String(brand.id)` |
| `sourcePaintType` | `string \| null` | `paint.paint_type` |
| `brands` | `Brand[]` | `brands` |
| `paintTypes` | `string[]` | `paintTypes` |

## Layout Mockup

```
┌── [Similar] [Color Schemes] ──────────────────────────┐
│                                                        │
│  (active panel renders here)                           │
│                                                        │
└────────────────────────────────────────────────────────┘

┌── Substitutes (discontinued only) ─────────────────────┐
│  ...                                                   │
└────────────────────────────────────────────────────────┘
```

Active button: filled/primary. Inactive: ghost/muted.

## Risks & Considerations

- **Filter state resets on tab switch** — `PaintSimilarSection` owns its filter state internally. Switching away and back resets it. This is acceptable for v1; if it becomes a complaint, lift state into `PaintSectionsToggle` later.
- **`PaintSimilarSection` re-fetches on remount** — The section fires `findPaintMatches` on mount. Toggling away and back causes a re-fetch. Same trade-off as above; a future enhancement could memo the results.
