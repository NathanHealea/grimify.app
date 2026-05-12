# Side-by-Side Paint Comparison UI

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo
**Branch:** `feature/comparison-ui`
**Merge into:** `epic/cross-brand-comparison`

## Summary

Add a `/compare` page that displays up to 6 paints side by side with large swatches, brand/line metadata, paint type, hex, and pairwise CIE76 ΔE scores. Selection is driven by URL params (`?paints=id1,id2,...`) so comparisons are shareable, and any paint detail page gains a "Find similar" button that pre-populates the comparison with the source paint and the top matches from the engine in feature 00.

## Acceptance Criteria

- [ ] Users can land on `/compare` and add paints via a search-driven combobox (reuses `PaintCombobox`).
- [ ] Up to 6 paints can be compared at once. Adding past the cap is disabled with a clear message.
- [ ] Selected paints render in a horizontally-scrolling row (mobile: stacked) with large color swatches, paint name, brand, product line, paint type, and hex.
- [ ] A pairwise ΔE matrix renders below the swatches (small grid showing the ΔE between each pair).
- [ ] Each comparison card has a Remove button.
- [ ] The selected paint IDs are reflected in `?paints=id1,id2,id3` and re-hydrate on reload. `replaceState` is used for add/remove so the URL is shareable without flooding history.
- [ ] Paint detail page (`/paints/[id]`) gains a "Find similar" link/button that navigates to `/compare?paints=<sourceId>,<match1>,<match2>,...` pre-populated with the top 5 cross-brand matches from `findPaintMatches`.
- [ ] Empty state shows a paint picker plus a brief explainer.
- [ ] JSDoc on every exported type, function, component, and action per `CLAUDE.md`.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Dependencies

- **Requires feature 00** (color-matching-engine) for the "Find similar" pre-population. The page itself can ship without that flow, but the acceptance criterion above expects it.

## Domain Module

This feature lives in `src/modules/paints/` — comparison is a paint-centric view that wraps existing paint primitives (cards, combobox, color math). No new module needed.

## Routes

| Route                         | Description                          |
| ----------------------------- | ------------------------------------ |
| `/compare`                    | Comparison page (empty when no `?paints` param) |
| `/compare?paints=id1,id2,id3` | Shareable comparison URL             |

## Key Files

| Action | File                                                                  | Description                                                                          |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Create | `src/app/compare/page.tsx`                                            | Thin route page — parses `?paints`, fetches paint records server-side, renders the explorer. |
| Create | `src/app/compare/loading.tsx`                                         | Skeleton loading screen (mirror the pattern from `src/app/paints/loading.tsx`).      |
| Create | `src/modules/paints/components/paint-comparison-explorer.tsx`         | Thin client component — composes the picker, card row, and matrix; delegates state to `usePaintComparisonSelection`. |
| Create | `src/modules/paints/components/paint-comparison-card.tsx`             | Single paint card with large swatch, metadata, and remove button.                    |
| Create | `src/modules/paints/components/paint-comparison-delta-matrix.tsx`     | NxN pairwise ΔE grid for the selected paints (uses `computePairwiseDeltaE`).         |
| Create | `src/modules/paints/components/paint-comparison-picker.tsx`           | Wraps `PaintCombobox` with the "max 6" disabled-state and "already added" filtering. |
| Create | `src/modules/paints/components/find-similar-button.tsx`               | Link button shown on `PaintDetail`; thin renderer that calls `useFindSimilarPaints`. |
| Create | `src/modules/paints/hooks/use-paint-comparison-selection.ts`          | Selection state, URL sync, add/remove/dedupe/cap, and full-record hydration for `/compare`. |
| Create | `src/modules/paints/hooks/use-find-similar-paints.ts`                 | Wraps `findPaintMatches` with `useTransition` + error state and a `navigateToCompare(id)` helper. |
| Create | `src/modules/paints/utils/parse-compare-params.ts`                    | Parses/serialises the `paints` query param (CSV → string[], dedupe, cap at 6).       |
| Create | `src/modules/paints/utils/compute-pairwise-delta-e.ts`                | Pure helper — `(paints: { id; hex }[]) => Record<idA, Record<idB, number>>`. Caches Lab per paint. |
| Create | `src/modules/paints/utils/build-compare-url.ts`                       | Pure helper — `(ids: string[]) => '/compare?paints=...'`. Reused by `useFindSimilarPaints` and any other "open a comparison" entry point. |
| Create | `src/modules/paints/actions/get-paints-for-compare.ts`                | `'use server'` action — bulk hydration for newly-added paint IDs (called by the hook on URL changes that the SSR cache doesn't already cover). |
| Modify | `src/modules/paints/components/paint-detail.tsx`                      | Render `<FindSimilarButton paintId={paint.id} />` next to existing action buttons.   |
| Modify | `src/components/navbar.tsx` (optional)                                | Add a "Compare" link if the nav has space.                                           |

## Existing Building Blocks (Reuse)

| Building block                             | Path                                                                | Use in this feature                                       |
| ------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------- |
| `PaintCombobox`                            | `src/modules/paints/components/paint-combobox.tsx`                  | Live-filtered paint picker.                               |
| `getColorWheelPaints()`                    | `src/modules/paints/services/paint-service.ts`                      | Source list for the combobox (already excludes discontinued). |
| `PaintCard`                                | `src/modules/paints/components/paint-card.tsx`                      | Optional: tiny links inside the delta matrix legend.      |
| `hexToLab`, `deltaE76`                     | `src/modules/color-wheel/utils/`                                    | Imported only inside `compute-pairwise-delta-e.ts` — never directly by components. |
| `useSearchUrlState`                        | `src/modules/paints/hooks/use-search-url-state.ts`                  | Used inside `usePaintComparisonSelection` for `?paints=` sync — never directly by components. |
| `findPaintMatches` action (feature 00)     | `src/modules/paints/actions/find-paint-matches.ts`                  | Called only from `useFindSimilarPaints` — feature 01 never invokes the action from a component body. |
| `PaintWithRelationsAndHue`                 | `src/modules/paints/services/paint-service.ts`                      | Shape returned by `getPaintById` — needed for full metadata in cards. |
| `Main`, `PageHeader`, `Breadcrumbs`        | `src/components/`                                                   | Page chrome — same as other route pages.                  |
| `Button` / shadcn primitives + `src/styles` | `src/components/ui/`, `src/styles/`                                 | All buttons and the matrix use existing utility classes.  |

## Implementation Plan

### Reusable extraction summary

This feature pushes all stateful and pure logic out of the components into hooks/utils/actions so each component stays a thin renderer. The codebase already follows this pattern under `src/modules/<module>/hooks/` (e.g. `use-search-url-state.ts`, `use-paint-search.ts`, `use-wheel-paint-selection.ts`) — there is no shared `src/hooks/` directory.

| Kind     | Name                                                | Location                                                        | Owner | Used by                                                                  |
| -------- | --------------------------------------------------- | --------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| Hook     | `usePaintComparisonSelection`                       | `src/modules/paints/hooks/use-paint-comparison-selection.ts`    | 01    | `PaintComparisonExplorer`. Owns selected IDs, URL sync (built on `useSearchUrlState`), add/remove/cap/dedupe, and async hydration via `getPaintsForCompare`. Returns `{ selectedIds, paints, addPaint, removePaint, canAddMore, isHydrating }`. |
| Hook     | `useFindSimilarPaints`                              | `src/modules/paints/hooks/use-find-similar-paints.ts`           | 01    | `FindSimilarButton`. Returns `{ findAndNavigate(paintId, limit?), isPending, error }`. Internally calls `findPaintMatches` (feature 00) and `buildCompareUrl`, then `router.push`. |
| Util     | `computePairwiseDeltaE`                             | `src/modules/paints/utils/compute-pairwise-delta-e.ts`          | 01    | `PaintComparisonDeltaMatrix`. Memoisable pure function — keeps the matrix component a pure renderer over a precomputed grid. |
| Util     | `buildCompareUrl`                                   | `src/modules/paints/utils/build-compare-url.ts`                 | 01    | `useFindSimilarPaints`, the route page's "share" affordance if added later. |
| Util     | `parseCompareParam`, `serializeCompareParam`        | `src/modules/paints/utils/parse-compare-params.ts`              | 01    | Route SSR + `usePaintComparisonSelection`'s URL serializer.              |
| Action   | `getPaintsForCompare(ids)`                          | `src/modules/paints/actions/get-paints-for-compare.ts`          | 01    | `usePaintComparisonSelection` — bulk hydration when the user adds a paint that isn't already in `initialPaints`. |
| Reused   | `findPaintMatches` (action)                         | `src/modules/paints/actions/find-paint-matches.ts` (feature 00) | 00    | Called from `useFindSimilarPaints`. Do not wrap further on the server side. |

**Component contract:** every comparison component renders from props it is given by the hook. No component fetches, parses URL params, computes ΔE, or calls `router.push` directly. `PaintComparisonExplorer` is a one-screen `'use client'` orchestrator that calls `usePaintComparisonSelection(...)` and passes its return values down.

### 1. URL param parser

`src/modules/paints/utils/parse-compare-params.ts` exports:

- `parseCompareParam(raw: string | undefined): string[]` — split on `,`, trim, drop empties, dedupe, cap at 6.
- `serializeCompareParam(ids: string[]): string` — `ids.slice(0, 6).join(',')`.

Both are pure helpers used by the route page (SSR) and the client component (URL sync).

### 2. Route page (`src/app/compare/page.tsx`)

Thin SSR shell:

1. Read `searchParams.paints` and call `parseCompareParam`.
2. For each ID, call `paintService.getPaintById(id)` in parallel; drop nulls.
3. Render `<Main>` with `PageHeader` ("Compare Paints"), `Breadcrumbs`, and `<PaintComparisonExplorer initialPaints={...} catalog={...} />` where `catalog` is the result of `paintService.getColorWheelPaints()` for the picker.

Add `export const metadata` using `pageMetadata({ title: 'Compare', ... })` from the SEO module — mirror `src/app/paints/page.tsx`.

### 3. `usePaintComparisonSelection` hook

`src/modules/paints/hooks/use-paint-comparison-selection.ts` — `'use client'`.

```ts
export function usePaintComparisonSelection(params: {
  initialPaints: PaintWithRelationsAndHue[]
}): {
  selectedIds: string[]
  paints: PaintWithRelationsAndHue[]
  addPaint: (id: string) => void
  removePaint: (id: string) => void
  canAddMore: boolean
  isHydrating: boolean
}
```

Responsibilities:

- Owns `selectedIds`, initialised from `initialPaints.map(p => p.id)`.
- URL sync via `useSearchUrlState` keyed on `paints` with history strategy `'replace'` (add/remove should not flood history). Uses `parseCompareParam` / `serializeCompareParam` as `hydrate`/`serialize`.
- `addPaint(id)` — dedupe, cap at 6, push to URL. Sets `canAddMore = selectedIds.length < 6`.
- `removePaint(id)` — filter out.
- Maintains a `Map<id, PaintWithRelationsAndHue>` keyed cache. Seeds from `initialPaints`. On URL change, computes the diff `selectedIds \ cache.keys()` and calls `getPaintsForCompare(missing)` to hydrate; sets `isHydrating` during the call.
- Returns the ordered `paints` array (matches `selectedIds` order).

### 4. `PaintComparisonExplorer` (thin)

Client component (`'use client'`). The component body becomes ~30 lines: hook call + JSX. No state, no URL parsing, no fetching.

```tsx
const { selectedIds, paints, addPaint, removePaint, canAddMore, isHydrating } =
  usePaintComparisonSelection({ initialPaints })
```

Renders:

- `<PaintComparisonPicker selectedIds={selectedIds} catalog={catalog} onAdd={addPaint} canAddMore={canAddMore} />`
- A horizontally-scrolling row (mobile: vertical stack) of `<PaintComparisonCard paint={p} onRemove={removePaint} />`.
- `<PaintComparisonDeltaMatrix paints={paints} />` when `paints.length >= 2`.
- Empty state when `paints.length === 0`: short blurb + the picker.
- Skeleton overlay while `isHydrating`.

### 5. `PaintComparisonCard`

Module component in `src/modules/paints/components/paint-comparison-card.tsx`:

- Props: `paint: PaintWithRelationsAndHue`, `onRemove: (id: string) => void`.
- Renders a 192×192 (md) / 128×128 (sm) swatch, paint name (as a link to `/paints/[id]`), brand → product line, paint type chip, hex (mono), metallic/discontinued badges (reuse the badge classes already in `paint-detail.tsx`).
- Top-right Remove button (icon button using `lucide-react` `X`).
- Use existing daisyUI-style classes from `src/styles/` for the card shell (`card`, `btn`, `btn-ghost`).
- Pure renderer — no state, no fetching.

### 6. `computePairwiseDeltaE` util + `PaintComparisonDeltaMatrix`

`src/modules/paints/utils/compute-pairwise-delta-e.ts`:

```ts
export function computePairwiseDeltaE(
  paints: { id: string; hex: string }[],
): Record<string, Record<string, number>>
```

Precomputes `hexToLab` per paint once, then fills the upper triangle of the matrix and mirrors it. Returned shape is `result[idA][idB] = ΔE`. Pure, easily memoisable.

`src/modules/paints/components/paint-comparison-delta-matrix.tsx`:

- Props: `paints: PaintWithRelationsAndHue[]` (length ≥ 2).
- Computes the matrix via `useMemo(() => computePairwiseDeltaE(paints), [paints])`.
- Render an `NxN` table: diagonal blank, off-diagonal cells show ΔE rounded to 1 decimal. Highlight cells where ΔE < 2 (imperceptible) with a soft success tone; > 10 with muted text.
- Row/column headers are short paint names with a swatch dot.
- Component body owns no math beyond the `useMemo` lookup — `hexToLab`/`deltaE76` are imported only inside the util.

### 7. `PaintComparisonPicker`

`src/modules/paints/components/paint-comparison-picker.tsx`:

- Props: `selectedIds: string[]`, `catalog: ColorWheelPaint[]`, `onAdd: (id: string) => void`, `canAddMore: boolean`.
- Wraps `PaintCombobox` but excludes paints already in `selectedIds` from the candidate list.
- When `canAddMore === false`, render a disabled state with a helper line ("Remove a paint to add another"). The cap is enforced by the hook; the picker just reflects it.

### 8. `useFindSimilarPaints` hook + `FindSimilarButton`

`src/modules/paints/hooks/use-find-similar-paints.ts` — `'use client'`:

```ts
export function useFindSimilarPaints(): {
  findAndNavigate: (paintId: string, limit?: number) => Promise<void>
  isPending: boolean
  error: Error | null
}
```

- Internally calls `findPaintMatches(paintId, { limit })` (feature 00's action), passes the result through `buildCompareUrl([paintId, ...matches.map(m => m.paint.id)])`, and `router.push`-es.
- Uses `useTransition` to drive `isPending`. Surfaces errors via state + a `sonner` toast.

`src/modules/paints/utils/build-compare-url.ts`:

```ts
export function buildCompareUrl(paintIds: string[]): string
```

Caps to 6, joins with `,`, returns `'/compare?paints=...'`. Pure — shared with any other "open a comparison" entry point added later.

`src/modules/paints/components/find-similar-button.tsx`:

- `'use client'`. Props: `paintId: string`, optional `limit?: number` (default 5).
- Calls `const { findAndNavigate, isPending } = useFindSimilarPaints()`.
- Renders a `<Button>` disabled while `isPending`; click handler calls `findAndNavigate(paintId, limit)`. Component body is ~15 lines.

### 9. Wire into `PaintDetail`

Edit `src/modules/paints/components/paint-detail.tsx`:

- Add `<FindSimilarButton paintId={paint.id} />` inside the action-button row, alongside `<CollectionToggle />` and `<AddToPaletteButton />`.
- No layout overhaul — just one more button in the existing flex row.

### 10. Loading state

`src/app/compare/loading.tsx` — mirror the skeleton pattern from `src/app/paints/loading.tsx`: page header skeleton + a row of card skeletons.

## Order of Operations

1. Utils: `parse-compare-params.ts`, `compute-pairwise-delta-e.ts`, `build-compare-url.ts` (no deps).
2. Server action: `get-paints-for-compare.ts`.
3. Hooks: `usePaintComparisonSelection`, `useFindSimilarPaints` (depend on the utils + actions above).
4. Components in dependency order: `PaintComparisonCard` → `PaintComparisonDeltaMatrix` → `PaintComparisonPicker` → `PaintComparisonExplorer` (each is a thin renderer over hooks/utils).
5. Route page + `loading.tsx`.
6. `FindSimilarButton` + wire into `PaintDetail` (this is the step that exercises feature 00's action end-to-end).

## Notes

- Cap of 6 paints keeps the matrix readable (`6x6 = 30` off-diagonal cells).
- All buttons use shadcn `Button` + daisyUI classes from `src/styles/button.css`; no native `<select>` anywhere — pickers use `PaintCombobox` or Radix `Select`.
- URL params stay in `?paints=` CSV form for human-readable shareable links.
- A 50/50 blend preview is intentionally **out of scope for v1** — flagged as a future enhancement once basic comparison UX lands.
- Discontinued paints can still be added to a comparison (they are visible from search results), but the "Find similar" pre-population only seeds with current paints.
