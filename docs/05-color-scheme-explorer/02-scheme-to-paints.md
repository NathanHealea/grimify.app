# Map Schemes to Available Paints

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Done
**Branch:** `feature/scheme-to-paints`
**Merge into:** `v1/main`

## Summary

For each color in a generated scheme, find and suggest the closest matching real paints from the database, bridging the gap between abstract color theory and actual available products.

## Acceptance Criteria

- [x] Each scheme color shows the top 3-5 closest matching paints
- [x] Matches are ranked by Delta E (perceptual distance)
- [x] Users can filter suggested paints by brand
- [x] Users can filter to show only paints they own (if authenticated)
- [x] Clicking a suggested paint opens its detail view
- [ ] The entire scheme can be saved as a palette (links to Community & Social epic) — deferred; depends on `07-community-social/01-palette-sharing.md`
- [x] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action  | File                                                                  | Description                                                          |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Create  | `src/modules/color-wheel/utils/hex-to-lab.ts`                         | sRGB → linear RGB → XYZ (D65) → CIE Lab conversion                   |
| Create  | `src/modules/color-wheel/utils/delta-e.ts`                            | CIE76 Δ between two Lab colors                                       |
| Create  | `src/modules/color-schemes/types/paint-match.ts`                      | `{ paint, deltaE }` shape returned by the matcher                    |
| Create  | `src/modules/color-schemes/types/scheme-filter-state.ts`              | Brand + owned-only filter shape and empty constant                   |
| Create  | `src/modules/color-schemes/utils/find-matching-paints.ts`             | Replaces `find-nearest-paints.ts`; ranks paints by Δ to a target hex |
| Create  | `src/modules/color-schemes/utils/apply-scheme-filters.ts`             | Filters candidate paints by brand + owned-only before matching       |
| Create  | `src/modules/color-schemes/components/scheme-paint-filters.tsx`       | Brand multi-select + owned-only toggle UI                            |
| Create  | `src/modules/color-schemes/components/scheme-paint-match-card.tsx`    | Wraps `CollectionPaintCard` and overlays a `ΔE n.n` badge            |
| Modify  | `src/modules/color-schemes/types/scheme-color.ts`                     | `nearestPaints` becomes `PaintMatch[]`                               |
| Modify  | `src/modules/color-schemes/components/scheme-explorer.tsx`            | Owns filter state, runs the new matcher, renders the filters panel   |
| Modify  | `src/modules/color-schemes/components/scheme-swatch-grid.tsx`         | Forward filter-aware `SchemeColor`s unchanged                        |
| Modify  | `src/modules/color-schemes/components/scheme-swatch.tsx`              | Render `SchemePaintMatchCard` and handle the empty-candidate case    |
| Delete  | `src/modules/color-schemes/utils/find-nearest-paints.ts`              | Superseded by `find-matching-paints.ts`                              |

## Implementation

### Current state (already shipped in v1)

- `findNearestPaints` in `src/modules/color-schemes/utils/find-nearest-paints.ts` returns the top **5** paints by **circular hue distance** — there is no perceptual ranking yet.
- `SchemeSwatch` already renders a `CollectionPaintCard` per suggestion, and `PaintCard` already wraps each card in `<Link href="/paints/{id}">`, so **clicking a suggestion already opens its detail page**.
- The schemes page already threads `isAuthenticated` and `collectionPaintIds` to the explorer, and `CollectionPaintCard` already exposes a per-paint collection toggle. No new auth/collection plumbing is needed.

The work below upgrades the ranking to perceptual distance, adds filter controls, and surfaces the Δ score on each match card.

### 1. Lab + Delta E primitives (`color-wheel` module)

These are pure color-math helpers. They live in `color-wheel/utils/` next to `hex-to-hsl.ts` so they can be reused by the future Cross-Brand Comparison epic without depending on `color-schemes/`.

1. Create `src/modules/color-wheel/utils/hex-to-lab.ts` exporting:
   - `type Lab = { L: number; a: number; b: number }`
   - `rgbToXyz(r, g, b)` — sRGB companding (`/255`, gamma `2.4`/`1/12.92` split) → linear RGB → multiply by the standard sRGB → XYZ matrix.
   - `xyzToLab({ x, y, z })` — divide by D65 reference white (Xn=95.047, Yn=100.000, Zn=108.883), apply the Lab `f(t)` (cube-root above ε, linear below), produce L/a/b.
   - `hexToLab(hex: string): Lab` — composes `hexToRgb` (already in `hex-to-hsl.ts`) with the two helpers above.
2. Create `src/modules/color-wheel/utils/delta-e.ts` exporting `deltaE76(a: Lab, b: Lab): number` — Euclidean distance in Lab.
   - JSDoc explains why CIE76 (simple, well-known, fine for ranking; CIEDE2000 is deferred until ranking quality complaints surface).

### 2. Match shape + matcher (`color-schemes` module)

1. Create `src/modules/color-schemes/types/paint-match.ts` exporting `PaintMatch = { paint: ColorWheelPaint; deltaE: number }`. JSDoc the `deltaE` field as "CIE76 Δ vs the target color, lower = closer match".
2. Create `src/modules/color-schemes/utils/find-matching-paints.ts`:
   - Signature: `findMatchingPaints(targetHex: string, paints: ColorWheelPaint[], limit = 3): PaintMatch[]`
   - Compute target `Lab` once via `hexToLab`.
   - For each paint, compute `deltaE76(targetLab, hexToLab(paint.hex))`.
   - Sort ascending by `deltaE`, slice to `limit`.
   - Default limit is **3** (down from 5) — doc says "top 3-5"; leaning toward the lower bound keeps the swatch column tight and reduces visual noise. The cap stays a parameter so it can be raised later without an API change.
3. Delete `src/modules/color-schemes/utils/find-nearest-paints.ts` — fully superseded.

### 3. Filter shape + filter helper

1. Create `src/modules/color-schemes/types/scheme-filter-state.ts`:
   ```ts
   export type SchemeFilterState = { brandIds: string[]; ownedOnly: boolean }
   export const EMPTY_SCHEME_FILTER_STATE: SchemeFilterState = { brandIds: [], ownedOnly: false }
   ```
2. Create `src/modules/color-schemes/utils/apply-scheme-filters.ts`:
   - Signature: `applySchemeFilters(paints, state, ownedIds?): ColorWheelPaint[]`
   - Mirrors the brand + owned logic from `applyWheelFilters` but drops product-line and paint-type filters (out of scope for v1 of this feature).
   - When `ownedOnly` is true and `ownedIds` is missing/empty, behave as if the toggle is off (consistent with `applyWheelFilters`'s graceful unauthenticated handling).

### 4. Filter UI

Create `src/modules/color-schemes/components/scheme-paint-filters.tsx` — a compact panel that sits between `SchemeTypeSelector` and `SchemeSwatchGrid`.

- Props: `{ options: FilterOptions; state: SchemeFilterState; showOwnedFilter: boolean; onChange: (next: SchemeFilterState) => void }`.
- Layout: a single horizontal row with a brand multi-select control (use existing daisyUI checkbox classes) inside a collapsible section, plus an inline "My collection only" toggle when `showOwnedFilter` is true.
- Active filters render as removable chips below the toggle, matching the chip styling already used in `WheelFiltersPanel` (`badge badge-soft badge-sm`). Include a "Clear all" affordance when at least one filter is active.
- Reuse `deriveFilterOptions` from `color-wheel/utils/derive-filter-options.ts` — no need to duplicate.

### 5. Match card with ΔE badge

Create `src/modules/color-schemes/components/scheme-paint-match-card.tsx`.

- Props: `{ match: PaintMatch; isAuthenticated: boolean; isOwned: boolean }`.
- Renders `CollectionPaintCard` (with `revalidatePath="/schemes"` so the toggle keeps working) and overlays a small badge (`badge badge-soft badge-xs`) absolutely positioned in the bottom-right showing `ΔE {deltaE.toFixed(1)}`. The badge is purely informational — it must not capture clicks (`pointer-events-none`) so the underlying `<Link>` from `PaintCard` keeps working.

### 6. Wire the explorer

Modify `src/modules/color-schemes/components/scheme-explorer.tsx`:

- Add `const [filterState, setFilterState] = useState<SchemeFilterState>(EMPTY_SCHEME_FILTER_STATE)`.
- Memoize `filterOptions = useMemo(() => deriveFilterOptions(paints), [paints])`.
- Memoize `candidatePaints = useMemo(() => applySchemeFilters(paints, filterState, ownedIds), [paints, filterState, ownedIds])`.
- Update `schemeColors`'s mapper to call `findMatchingPaints(color.hex, candidatePaints, 3)` and produce `PaintMatch[]`.
- Render `<SchemePaintFilters>` between the type selector and the swatch grid; only show the owned toggle when `isAuthenticated`.

Modify `src/modules/color-schemes/types/scheme-color.ts`:

- `nearestPaints: ColorWheelPaint[]` → `nearestPaints: PaintMatch[]`. Update the JSDoc.

Modify `src/modules/color-schemes/components/scheme-swatch.tsx` and `scheme-swatch-grid.tsx`:

- The grid forwards `SchemeColor` unchanged.
- The swatch maps `color.nearestPaints` (now `PaintMatch[]`) to `<SchemePaintMatchCard match={m} isOwned={ownedIds.has(m.paint.id)} isAuthenticated={isAuthenticated} />`.
- When `color.nearestPaints.length === 0` (filters eliminated every candidate), show a single muted line: "No matching paints with the current filters." This keeps the row height roughly consistent and gives the user a hint to relax filters.

### 7. Manual QA checklist (no automated test framework in this project)

- Pick a base paint, generate complementary scheme — three paints render per swatch with a ΔE badge.
- Switch to triadic/analogous — same behavior on every position.
- Toggle one brand only — every swatch's matches narrow to that brand; ΔE values may rise.
- Toggle "My collection only" while signed in — only owned paints show; toggle off restores full set.
- Sign-out + load `/schemes` — owned-only toggle is hidden, brand filter still works.
- Filter to a brand the user doesn't own with owned-only on — swatches show the empty-state line.
- Click a suggestion — navigates to `/paints/{id}` (regression check; should already work).
- `npm run build` and `npm run lint` succeed.

### 8. Out of scope (deferred)

- **"The entire scheme can be saved as a palette"** depends on the palette-sharing feature in the Community & Social epic, which has no schema yet. Acceptance criterion stays in the doc but won't be addressed in this PR — track as a follow-up once `07-community-social/01-palette-sharing.md` lands. Note this explicitly in the PR description.

## Risks & considerations

- **Δ flavor**: CIE76 is the simplest perceptual metric and runs in ~constant time per paint; with a few hundred paints recomputation per filter change is well under one frame. CIEDE2000 is more accurate near saturated/dark colors but materially more code; revisit only if the v1 ranking feels off.
- **Default match count drop (5 → 3)**: tightens the column visually and reduces irrelevant suggestions, but is a visible UX change. Manually QA both before/after to confirm scheme rows don't feel empty.
- **`applySchemeFilters` overlap with `applyWheelFilters`**: kept as a separate, smaller helper to avoid coupling the schemes module to the wheel's full filter state shape. If a third surface ever needs the same combo, promote both into a shared `paint-filtering` util.
- **`hex-to-lab.ts` precision**: standard sRGB→Lab matrices and D65 white point — no rounding in the helper; rounding happens only at display time (`toFixed(1)` in the badge).
- **Memo invalidation**: `ownedIds` is already memoized as a new `Set` whenever `collectionPaintIds` changes, so passing it into `applySchemeFilters` won't cause every render to recompute candidates.

## Notes

- This feature bridges color theory with practical paint selection — a core value proposition of Grimify.
- Depends on the color matching engine from Cross-Brand Comparison.
- The "save as palette" action connects to the Community & Social epic (palette sharing).
