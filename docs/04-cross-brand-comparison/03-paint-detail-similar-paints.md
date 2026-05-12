# Similar Paints on the Paint Detail Page

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo
**Branch:** `feature/paint-detail-similar-paints`
**Merge into:** `main`

## Summary

Add a "Similar Paints" section to every `/paints/[id]` page that surfaces perceptually-close paints from across the catalog. Matches are ranked by CIE76 ΔE via the existing `findPaintMatches` action (feature 00), grouped or filterable by **brand** and **paint type**, and rendered as a grid of `PaintCard`s with their ΔE score. Unlike feature 02 (which only fires for discontinued paints) and feature 01 (which is the dedicated `/compare` page), this section appears on **every** paint detail page so painters can spot cross-brand and cross-type alternates while browsing.

## Acceptance Criteria

- [ ] On `/paints/[id]` for any paint (discontinued or not), a "Similar Paints" section renders below the existing color-values grid and hue classification block.
- [ ] The section shows the top 12 matches by default, ranked by CIE76 ΔE ascending, with the ΔE score displayed on each card.
- [ ] Matches exclude the source paint and discontinued paints by default.
- [ ] The section includes a **brand** multi-select filter and a **paint type** multi-select filter (both populated from the catalog, with `null` paint types grouped under "Untyped").
- [ ] A "Same brand only" toggle is available — when on, the engine's `excludeSameBrand` flag is set to `false` and `brandIds` is restricted to the source paint's brand. When off (default), cross-brand matches are surfaced (engine default).
- [ ] Active filters render as removable chips above the grid, matching the chip styling already used in `WheelFiltersPanel` (`badge badge-soft badge-sm`), with a "Clear all" affordance when at least one filter is active.
- [ ] When the active filter combination eliminates every candidate, a muted empty-state line reads: "No similar paints with the current filters." (mirrors the empty state from `02-scheme-to-paints.md`).
- [ ] On discontinued paints the section still renders. The discontinued-specific "Substitutes" block from feature 02 is **not** removed by this feature — they can coexist (Substitutes is opinionated about *replacing* a discontinued paint; Similar Paints is a general browse aid). See "Coexistence with feature 02" below.
- [ ] JSDoc on every exported type, function, component, and action per `CLAUDE.md`.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Dependencies

- **Requires feature 00** (`color-matching-engine`) — every match call goes through `findPaintMatches`. This feature cannot ship until feature 00 is implemented.
- Independent of features 01 (`/compare` page) and 02 (discontinued substitutes), but should land **after** feature 02 so the two sections can be visually reconciled on discontinued paint pages in a single PR.

## Domain Module

Lives in `src/modules/paints/`. No new module.

## Routes

No new routes. The section is mounted inside the existing `/paints/[id]` page via `PaintDetail`.

## Key Files

| Action | File                                                                  | Description                                                                                                            |
| ------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Create | `src/modules/paints/types/similar-paints-filter-state.ts`             | `SimilarPaintsFilterState` shape — `{ brandIds: string[]; paintTypes: string[]; sameBrandOnly: boolean }` and empty constant. |
| Create | `src/modules/paints/utils/derive-similar-paints-filter-options.ts`    | Pure helper that derives `{ brands: Brand[]; paintTypes: string[] }` from a `ColorWheelPaint[]` catalog snapshot.       |
| Create | `src/modules/paints/components/paint-similar-section.tsx`             | Client component — owns filter state, calls `findPaintMatches`, renders the filter chips, grid, and empty state.       |
| Create | `src/modules/paints/components/similar-paint-card.tsx`                | Thin wrapper around `PaintCard` that overlays a `ΔE n.n` badge (matches the pattern from `scheme-paint-match-card.tsx`). |
| Modify | `src/modules/paints/components/paint-detail.tsx`                      | Render `<PaintSimilarSection sourcePaintId={paint.id} sourceBrandId={brand.id} sourcePaintType={paint.paint_type} brands={brands} paintTypes={paintTypes} />` after the hue classification block. Adds new `brands` and `paintTypes` props. |
| Modify | `src/app/paints/[id]/page.tsx`                                        | Fetch `getAllBrands()` and a distinct list of paint types in parallel with the existing paint fetch; pass to `PaintDetail`. |
| Modify | `src/modules/paints/services/paint-service.ts`                        | Add `listDistinctPaintTypes(): Promise<string[]>` — `SELECT DISTINCT paint_type FROM paints WHERE paint_type IS NOT NULL ORDER BY paint_type` (or in-memory derivation from `getColorWheelPaints` if simpler). |

## Existing Building Blocks (Reuse)

| Building block                            | Path                                                            | Use in this feature                                                                              |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `findPaintMatches`                        | `src/modules/paints/actions/find-paint-matches.ts` (feature 00) | Engine call — ranks candidates and applies `brandIds`, `excludeDiscontinued`, `excludeSamePaint`, `excludeSameBrand`. |
| `MatchOptions`, `PaintMatch`              | `src/modules/paints/types/match-options.ts`, `paint-match.ts`   | Shapes for the action call and its return value.                                                 |
| `getAllBrands`                            | `src/modules/brands/services/brand-service.ts`                  | Populates the brand multi-select.                                                                |
| `PaintCard`                               | `src/modules/paints/components/paint-card.tsx`                  | Grid rendering — each match wraps a card.                                                        |
| `Skeleton`                                | `src/components/ui/skeleton.tsx`                                | Loading state while the action is in flight.                                                     |
| `badge badge-soft badge-sm` chips         | `src/styles/badge.css`                                          | Active-filter chip styling (matches `WheelFiltersPanel`).                                        |
| Radix `Select` / multi-select pattern     | `src/components/ui/select.tsx`                                  | Brand + paint-type pickers (no native `<select>` per `CLAUDE.md`).                               |

> Note: `findPaintMatches` already supports `brandIds`. Paint-type filtering is **not** an engine concern (the engine ranks by perceptual ΔE, not type) — it is applied client-side after the action returns, filtering `PaintMatch[]` by `paint.paint_type`. This keeps the engine narrow and matches how feature 02-scheme-to-paints layers filters on top of its ranker.

## Implementation Plan

### 1. Filter state + options helper

Create `src/modules/paints/types/similar-paints-filter-state.ts`:

```ts
/** Filter state for the Similar Paints section on the paint detail page. */
export type SimilarPaintsFilterState = {
  brandIds: string[]
  paintTypes: string[]
  sameBrandOnly: boolean
}

export const EMPTY_SIMILAR_PAINTS_FILTER_STATE: SimilarPaintsFilterState = {
  brandIds: [],
  paintTypes: [],
  sameBrandOnly: false,
}
```

Create `src/modules/paints/utils/derive-similar-paints-filter-options.ts`:

- Signature: `deriveSimilarPaintsFilterOptions(brands: Brand[], paintTypes: string[]): { brands: Brand[]; paintTypes: string[] }`
- Sort brands by name and paint types alphabetically; trim and dedupe defensively.
- JSDoc explains the shape and that the result is memo-friendly (stable references).

### 2. `similar-paint-card.tsx`

`src/modules/paints/components/similar-paint-card.tsx`:

- Props: `{ match: PaintMatch }`.
- Renders `<PaintCard ... />` and overlays a small badge (`badge badge-soft badge-xs`) absolutely positioned in the bottom-right showing `ΔE {match.deltaE.toFixed(1)}`. Badge is `pointer-events-none` so the underlying `<Link>` from `PaintCard` keeps working.
- This mirrors `scheme-paint-match-card.tsx` so the visual treatment is consistent across the app.

### 3. `paint-similar-section.tsx`

`src/modules/paints/components/paint-similar-section.tsx` — `'use client'`:

- Props:
  - `sourcePaintId: string`
  - `sourceBrandId: string`
  - `sourcePaintType: string | null`
  - `brands: Brand[]`
  - `paintTypes: string[]`
  - `defaultLimit?: number` (default `12`)
- State:
  - `filterState: SimilarPaintsFilterState` (initial: `EMPTY_SIMILAR_PAINTS_FILTER_STATE`).
  - `matches: PaintMatch[]` (server-action result).
  - `isPending: boolean` via `useTransition`.
- Effect: whenever `filterState` changes, call `findPaintMatches(sourcePaintId, options)` where `options` is computed as:
  - `excludeDiscontinued: true` (always — substitutes for discontinued is feature 02's job).
  - `excludeSamePaint: true`.
  - `excludeSameBrand`: `false` when `sameBrandOnly` is true (so same-brand matches are allowed); otherwise the engine default (`true`).
  - `brandIds`:
    - If `sameBrandOnly` is true → `[sourceBrandId]`.
    - Else if `filterState.brandIds.length > 0` → those ids.
    - Else → `undefined` (all brands except the source brand, per engine default).
  - `limit: defaultLimit` (the engine clamps to ≤ 50, so passing `12` is safe).
- After the action returns, apply paint-type filtering in-memory: when `filterState.paintTypes.length > 0`, drop matches whose `paint.paint_type` (or `'Untyped'` sentinel for `null`) is not in the selected set.
- Render:
  - Section header: `<h2>Similar Paints</h2>` with a one-line muted subtitle ("Ranked by perceptual distance from this paint").
  - Filter row:
    - Brand multi-select (Radix `Select` with multi-select chips, or a `Popover` with a checklist — pick whichever matches the existing `WheelFiltersPanel` UX).
    - Paint type multi-select.
    - "Same brand only" toggle (disabled when any brand filter chips are active — explained in the tooltip).
  - Active-filter chips row with a "Clear all" button when any chip is active.
  - Grid: `<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">` of `<SimilarPaintCard match={m} />`. Mirror the spacing used by other paint grids in the module.
  - Loading: 12 `<Skeleton>` boxes shaped like a paint card.
  - Empty state: muted line "No similar paints with the current filters." with a "Clear all filters" button when chips are active.

### 4. Wire into `PaintDetail`

Edit `src/modules/paints/components/paint-detail.tsx`:

- Add `brands: Brand[]` and `paintTypes: string[]` to the props.
- After the existing hue classification block (the closing `{subHue && ...}` div on line 146), render:

  ```tsx
  <PaintSimilarSection
    sourcePaintId={paint.id}
    sourceBrandId={String(brand.id)}
    sourcePaintType={paint.paint_type}
    brands={brands}
    paintTypes={paintTypes}
  />
  ```

- JSDoc the new props.

### 5. Service + route page wiring

In `src/modules/paints/services/paint-service.ts`, add:

```ts
/** Returns distinct, non-null paint-type strings sorted alphabetically. */
async function listDistinctPaintTypes(): Promise<string[]> {
  // Either a DISTINCT query or derive from getColorWheelPaints() — pick the simpler one.
}
```

Acceptable alternative: pluck the distinct list from the existing `getColorWheelPaints` result in the route page (one extra `Array.from(new Set(...))` pass) — this avoids a new DB round-trip and keeps the service narrow. Decide at implementation time; document the choice in the PR description.

In `src/app/paints/[id]/page.tsx`:

- Fetch `getAllBrands()` and the distinct paint-types list **in parallel** with the existing paint/parent-hue lookups (`Promise.all`).
- Pass both into `<PaintDetail ... brands={brands} paintTypes={paintTypes} />`.

### 6. Loading + skeleton

`PaintSimilarSection` owns its own loading skeleton (Step 3). The route page's loading.tsx does not need to change — the section appears below the fold of the initial paint detail render.

## Coexistence with feature 02 (Substitute Suggestions)

For **discontinued** paints both sections render on the same page:

1. **Substitutes** (from feature 02) — explicitly for replacing a discontinued paint; defaults to `limit: 5` cross-brand non-discontinued matches.
2. **Similar Paints** (this feature) — general browse aid; defaults to `limit: 12` and offers brand + paint-type filtering.

That is acceptable for v1 (they answer different questions and feature 02's section is already opinionated about its purpose). If the duplication feels redundant after both ship, the simplest fix is to render the Substitutes block **inside** the Similar Paints section header on discontinued pages (e.g., a callout strip above the grid that reads "Top substitutes:" and shows the first 5 matches with same defaults). Track that as a follow-up — do not block this feature on it.

## Order of Operations

1. Types + filter-options helper (Steps 1 & 2).
2. `SimilarPaintCard`.
3. `PaintSimilarSection` (Step 3) — works in isolation against a stub paint id during development.
4. Service + route page (Step 5).
5. Wire into `PaintDetail` (Step 4) — last so the route data is already flowing when the component mounts.

## Risks & Considerations

- **Default limit (12).** Smaller catalogs (a few hundred paints per brand) will rarely have 12 visually similar matches; the grid may look thin. The empty-state line keeps that from feeling broken. Revisit the default after manual QA — `8` may feel tighter visually.
- **`findPaintMatches` is called on every paint detail page view.** The engine runs server-side and the catalog is already cached at module scope by `rankPaintsByDeltaE`, so cost is one Lab conversion of the source paint plus an in-memory sort. No DB hit beyond the catalog fetch that's already shared by `getColorWheelPaints`.
- **Paint-type filter applied client-side after the action.** The engine returns up to 50 ranked matches and the section keeps 12 — if a user filters to a paint type that has fewer than 12 matches in the top-50 perceptual set, the grid will show fewer than 12. That is acceptable for v1; if it surfaces as a complaint, lift `limit` to 50 and trim client-side, or push the paint-type filter into the engine.
- **"Same brand only" toggle vs. brand chips.** Disabling the toggle while brand chips are active prevents the user from contradicting themselves. The toggle is the simpler one-tap path; the chips are the fine-grained path. Document the precedence in the tooltip.
- **Section placement** (per planning decision): below the hue classification block. This avoids pushing the technical data (hex/RGB/HSL grid) out of view above the fold and keeps the existing layout stable.
- **No automated tests** — the project has no test framework yet (`CLAUDE.md`). Cover the feature with the manual QA list below.

## Manual QA

- Open `/paints/[id]` for a paint with abundant catalog neighbours (e.g., a common red). The grid populates with 12 matches across multiple brands, sorted by ΔE ascending.
- Apply a brand filter — the grid narrows to that brand; ΔE values may rise.
- Apply a paint-type filter (e.g., "Layer") — only Layer paints remain.
- Toggle "Same brand only" — matches collapse to the source brand; brand chips become disabled.
- Open a paint with few neighbours (e.g., a rare metallic). Confirm fewer cards render gracefully (no broken grid).
- Open a discontinued paint — both the feature 02 "Substitutes" block and this "Similar Paints" section render. Layout is readable.
- Sign-out and reload — the section still works (no auth required for browsing matches).
- `npm run build` and `npm run lint` pass.

## Notes

- A ΔE under ~2.0 is generally considered imperceptible. The badge styling can pick this up in a future polish pass (e.g., color the badge green when `< 2`).
- Metallic paints aren't special-cased by the engine; if mis-ranking surfaces, add an `is_metallic` chip on the badge or weight metallic-vs-metallic separately. Out of scope for v1.
- This feature does **not** introduce a `/similar/[id]` route — the section is inline. If usage data later shows users want a fullscreen view, lift the section into its own route as a follow-up.
