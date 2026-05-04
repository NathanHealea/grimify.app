# Paint Rendering Refactor — Groups, Brand Rings, and Halos

**Epic:** Interactive Color Wheel
**Type:** Refactor
**Status:** Done
**Branch:** `refactor/paint-rendering`
**Merge into:** `v1/main`

## Summary

Refactor paint rendering on the color wheel to match the visual fidelity of the beta reference (`grimify.app.beta/src/components/ColorWheel.tsx`). Today the project draws one independent `<PaintMarker>` per row — a circle (or diamond for metallics) with an optional white dashed selection ring. The beta groups co-located paints, surrounds each group with a segmented brand-color ring, and layers owned/search/selection halos plus a multi-paint count badge on top.

This refactor brings the same group-based rendering into `src/modules/color-wheel/`, reusing the existing transform, segment, hover, scheme-overlay, and selection hooks. The paint-rings work (brand ring, owned ring, search-glow ring) is the headline addition; the multi-paint badge and filter-aware dimming are companion changes that only make sense once paints are grouped.

## Goals

- Group paints by hex so identical colors collapse to a single dot with a count badge.
- Render a segmented brand-color ring around each dot (one arc per unique brand in the group).
- Add an owned-collection halo when the user owns any paint in the group.
- Add a search-match glow ring when a paint matches the active search query.
- Replace the search/owned hard filter with opacity-based dimming so users keep spatial context (brand/line/type filters stay as hard removals for performance).
- Add UI toggles to show/hide the brand ring and the owned ring.
- Inline tooltip "Add/Remove from Collection" affordance on the selected group, matching the beta.

## Non-Goals

- No changes to the Itten segment background, hue ring, divider lines, segment labels, or scheme wedge overlays — those are already in parity (see [05-hsl-wheel-itten-segment-rendering.md](./05-hsl-wheel-itten-segment-rendering.md)).
- No changes to `MunsellColorWheel` paint rendering in this refactor — both wheels currently consume `PaintMarker`, but Munsell is on a separate visual track (hue-cell positioning vs. raw HSL). HSL is the closer match to the beta and the target of this work. Munsell will follow in a separate doc once the HSL pattern is settled.
- No new database migrations as a hard prerequisite. Brand color is derived deterministically from `brand_id` (see Open Decisions). A future doc may add a `brands.color` column.
- No state-management migration to Zustand. The beta uses Zustand stores (`useUIStore`, `useCollectionStore`, `useFilterStore`); this project keeps the existing hook-based local state and prop drilling from `ColorWheelContainer`.

## Acceptance Criteria

- [x] Paints sharing the same `hex` (case-insensitive) collapse into a single rendered dot
- [x] Multi-paint groups render a yellow count badge in the upper-right of the dot showing the paint count
- [x] Each dot is wrapped by a thin segmented arc band where each segment is colored by a unique brand from the group
- [x] Single-brand groups render a continuous brand ring (split into two halves for the degenerate full-circle case, matching the beta)
- [x] Authenticated users see a green halo around any group containing a paint they own
- [x] When a search query is active, matching groups render a yellow glow ring (using a Gaussian blur SVG filter) and non-matching groups are dimmed
- [x] When a color scheme is active, non-matching groups are dimmed (extra-dim when both scheme and search dim apply)
- [x] Brand ring visibility, owned ring visibility, and search input are exposed in `WheelFiltersPanel` and persist for the session
- [x] Selecting a group via click opens the existing `PaintDetailPanel` for the rep paint (multi-group still resolves to a single paint — see Open Decisions for the chosen behavior)
- [x] The selection ring scales with `r` to sit outside the brand ring when the brand ring is visible
- [x] All marker geometry continues to ignore `zoom` (matches current `paint-marker.tsx` behavior — markers stay constant in SVG units, just like the beta)
- [x] `npm run build` and `npm run lint` pass with no errors

## Affected Files

| Action | File | Changes |
| ------ | ---- | ------- |
| Create | `src/modules/color-wheel/types/paint-group.ts` | `PaintGroup` type — `key: string`, `paints: ColorWheelPaint[]`, `rep: ColorWheelPaint & { x: number; y: number }` |
| Create | `src/modules/color-wheel/utils/group-paints-by-hex.ts` | Pure function: groups paints by lowercased hex, computes rep wheel position once per group |
| Create | `src/modules/color-wheel/utils/get-brand-color.ts` | Deterministic stable color from `brand_id` (HSL hash) — replaceable by a DB column later |
| Create | `src/modules/color-wheel/components/brand-ring-arcs.tsx` | Renders the segmented arc band of unique brand colors around a center point |
| Create | `src/modules/color-wheel/components/paint-dot.tsx` | Group renderer: composes selection ring, owned ring, search ring, brand ring, center dot, multi-badge |
| Create | `src/modules/color-wheel/hooks/use-wheel-display-state.ts` | UI toggles — `showBrandRing`, `showOwnedRing` — persisted to `sessionStorage` |
| Create | `src/modules/color-wheel/hooks/use-wheel-search.ts` | Search query state and `searchMatchIds: Set<string>` derivation |
| Modify | `src/modules/color-wheel/components/hsl-color-wheel.tsx` | Render `<PaintDot>` per group instead of `<PaintMarker>` per paint; add `<defs>` with the search-glow filter; pass `userPaintIds`, search match ids, scheme matcher, dim/highlight state |
| Modify | `src/modules/color-wheel/components/wheel-filters-panel.tsx` | Add brand-ring toggle, owned-ring toggle, search input |
| Modify | `src/modules/color-wheel/components/color-wheel-container.tsx` | Wire new hooks; pass props through to `HslColorWheel`; thread `userPaintIds` to the wheel even when `ownedOnly` is off so the ring can render |
| Modify | `src/modules/color-wheel/utils/apply-wheel-filters.ts` | Drop search-based filtering responsibilities; brand/line/type/owned-only stay as hard filters |
| Modify | `src/modules/color-wheel/components/paint-marker.tsx` | Either delete (if only used by HSL wheel) or trim to the Munsell-only API. Confirm Munsell is the only remaining caller before deleting. |
| Modify | `src/modules/color-wheel/components/paint-detail-panel.tsx` | Add an "Add to Collection / Remove from Collection" button row that calls a collection action and respects the unauthenticated case (hide the button) |
| Reference | `src/modules/collection/actions/` | Reuse the existing add/remove server actions for the in-panel button (no new actions needed) |

## Open Decisions

These are non-blocking but worth pinning down before implementation starts. Reasonable defaults are listed first.

1. **Brand color source.** Beta has a static `brand.color` field in `brands.json`. The current schema (`public.brands`) has no `color` column. Options:
   - **(a) Deterministic from `brand_id`** — hash to an HSL hue, render `hsl(h, 60%, 50%)`. Zero migration cost, stable across sessions, but admins can't override per brand.
   - **(b) Add `brands.color text NULL` column** — explicit and editable, but adds a migration, RLS update, and admin UI work that's out of scope here.
   - **Recommendation:** start with (a), file a follow-up doc for (b) if a brand looks visually similar to a hue ring color.
2. **Group-level click behavior.** Beta opens its label tooltip on hover and resolves single-paint groups to that paint. For multi-paint groups, the beta tooltip shows count + hex but no per-paint detail. This project already has a single-paint detail panel. Options:
   - **(a) Click a group → open detail for `rep`** (current beta behavior).
   - **(b) Click a multi-paint group → open a stacked picker with one row per paint, each opening its own detail panel.**
   - **Recommendation:** ship (a) for parity. (b) is a worthwhile follow-up but expands scope.
3. **Search behavior.** Today `applyWheelFilters` does no search filtering and no search input exists on the panel. The beta searches paint name, brand name, and hex prefix. Add a debounced text input to `WheelFiltersPanel` that drives `searchMatchIds`. Filter chips do **not** include the search query — the search box is its own control.
4. **Owned-only vs. owned ring.** Today `state.ownedOnly` removes non-owned paints. The beta also has the equivalent toggle. The new owned **ring** is an independent UI control that always shows when authenticated, regardless of `ownedOnly`. Keep both: `ownedOnly` is a hard filter; `showOwnedRing` is a render toggle.

## Implementation Plan

Work proceeds in seven steps. Each step is a self-contained commit and leaves the wheel buildable.

### Step 1 — `PaintGroup` type and grouping utility

**New files:**

- `src/modules/color-wheel/types/paint-group.ts`
- `src/modules/color-wheel/utils/group-paints-by-hex.ts`

`PaintGroup` mirrors the beta's shape but uses the project's `ColorWheelPaint`:

```ts
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/** Group of paints sharing the same hex color, sharing one wheel position. */
export type PaintGroup = {
  /** Stable key — the lowercased hex of the rep. */
  key: string
  /** All paints in the group. */
  paints: ColorWheelPaint[]
  /** Representative paint with its computed wheel x/y attached. */
  rep: ColorWheelPaint & { x: number; y: number }
}
```

`groupPaintsByHex(paints, wheelRadius)`:

- Walks `paints` once, keying each paint by `paint.hex.toLowerCase()`.
- For each unique hex, picks the first-seen paint as `rep` and computes `{ x, y } = paintToWheelPosition(rep.hue / 360, rep.lightness / 100, wheelRadius)`.
- Returns the array of groups in insertion order. Ordering is stable but the visual order on the wheel is positional, so this only matters for keys.

This utility is pure — no React. Memoization happens at the call site.

### Step 2 — Brand color helper

**New file:** `src/modules/color-wheel/utils/get-brand-color.ts`

```ts
/**
 * Stable brand color derived from `brand_id` until the brands table grows a
 * `color` column. Same input → same output, distributed across the hue ring.
 */
export function getBrandColor(brandId: string): string {
  let hash = 0
  for (let i = 0; i < brandId.length; i++) {
    hash = (hash * 31 + brandId.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue} 60% 50%)`
}
```

`SVG fill` accepts modern `hsl()` syntax in all supported browsers. If the existing palette has any preferred mapping, swap to a small lookup map keyed by `brand_id` — same return type.

### Step 3 — `BrandRingArcs` component

**New file:** `src/modules/color-wheel/components/brand-ring-arcs.tsx`

Port the beta's `BrandRingArcs` (`grimify.app.beta/src/components/ColorWheel.tsx:30-79`) onto the project's primitives:

- Use `annularSectorPath(startDeg, endDeg, innerR, outerR)` from `utils/sector-path.ts` instead of the beta's local `buildHueRingPath`. The two functions disagree only in angle convention (`sector-path.ts` rotates by `-90°` so 0 = top); pass the same `0 → 360` brand-segment angles and the rotation handles itself.
- Resolve unique brands from the group (`paint.brand_id` → de-dupe), each with `name` and a color from `getBrandColor`.
- Inner radius `r + 1`, outer `r + 2.5`, matching the beta thickness.
- For a single-brand group, split the 360° arc into two halves (`0→180` and `180→359.99`) — `annularSectorPath` cannot draw a closed full circle (`largeArc` math degenerates), the same reason the beta splits.
- Stroke `rgba(0,0,0,0.3)`, strokeWidth `0.5`, `pointerEvents="none"` so the ring never intercepts the dot's click.

Receive `cx`, `cy`, `r`, and `paints` as props. Memoize the unique-brands list.

### Step 4 — `PaintDot` component

**New file:** `src/modules/color-wheel/components/paint-dot.tsx`

This component replaces `PaintMarker` for the HSL wheel. It composes (in z-order, back to front):

1. Group opacity wrapper — `<g opacity={dimmed ? (schemeDimmed ? 0.06 : 0.15) : 1}>`. Match the beta's two-tier dim values.
2. **Owned ring** — `<circle stroke="#10b981" />` at `r + (showBrandRing ? 5.5 : 3)` when `showOwnedRing && isOwned && !dimmed`.
3. **Search-glow ring** — `<circle stroke="#facc15" filter="url(#search-glow)" />` at `r + 3` when `searchHighlight && !dimmed`.
4. **Selection ring** — existing white-dashed circle at `showBrandRing ? r + 4 : r + 2.5` when `isSelected`.
5. **Brand ring arcs** — `<BrandRingArcs />` when `showBrandRing`.
6. **Center dot** — `<circle r={r} fill={rep.hex} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />`.
7. **Multi-paint badge** — yellow circle + count text in the upper-right (`rep.x + r * 0.7, rep.y - r * 0.7`), only when `paints.length > 1`. Match the beta's `r=4`, `fill="#f0c040"`, `fontSize={5}`, `fontWeight={800}` numbers exactly.

Radius rule, identical to beta:

```ts
const isMulti = paints.length > 1
const r = isMulti ? DOT_RADIUS + 2 : DOT_RADIUS // DOT_RADIUS = 5
```

Hover and click callbacks come from props (`onHover`, `onClick`) — the parent wires them to the existing `useWheelHover` and `useWheelPaintSelection` hooks.

Metallics from the current `paint-marker.tsx` (diamond shape) are dropped — the beta has no metallic distinction and grouping by hex makes per-paint shape impossible (a group of two paints, one metallic, has no single shape). If metallic disambiguation is still wanted, the multi-paint badge color or a small corner glyph can carry it in a follow-up.

### Step 5 — `<defs>` filter, hover/search/selection wiring, container plumbing

**Modify:** `src/modules/color-wheel/components/hsl-color-wheel.tsx`

1. Add the search-glow filter to the existing `<svg>` defs block (currently absent — wrap the SVG content in `<defs>` and `<g>`):

   ```tsx
   <defs>
     <filter id="search-glow" x="-50%" y="-50%" width="200%" height="200%">
       <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
       <feMerge>
         <feMergeNode in="blur" />
         <feMergeNode in="SourceGraphic" />
       </feMerge>
     </filter>
   </defs>
   ```

2. Replace the `paints.map(...) → <PaintMarker>` block with `paintGroups.map(...) → <PaintDot>`. `paintGroups` comes from `useMemo(() => groupPaintsByHex(paints, WHEEL_RADIUS), [paints])`.

3. Add new props to `HslColorWheel`:

   ```ts
   userPaintIds?: Set<string>
   searchMatchIds: Set<string>
   showBrandRing: boolean
   showOwnedRing: boolean
   isSchemeMatching?: (paint: ColorWheelPaint) => boolean
   ```

4. For each group, compute:
   - `isOwned = userPaintIds && group.paints.some((p) => userPaintIds.has(p.id))`
   - `searchHighlight = searchMatchIds.size > 0 && group.paints.some((p) => searchMatchIds.has(p.id))`
   - `dimmed = (searchMatchIds.size > 0 && !searchHighlight) || (isSchemeActive && !groupMatchesScheme)`
   - `schemeDimmed = isSchemeActive && !groupMatchesScheme`
   - `isSelected = selectedPaint && group.paints.some((p) => p.id === selectedPaint.id)`

5. The drag-suppressed click guard (`dragDistanceRef.current > 3`) wraps `onClick` exactly as it does for the existing marker.

**Modify:** `src/modules/color-wheel/components/color-wheel-container.tsx`

- Always thread `userPaintIds` to `HslColorWheel`, regardless of `ownedOnly`. The owned ring needs the set even when no filter is on.
- Add `useWheelDisplayState()` and `useWheelSearch()` calls; pass `showBrandRing`, `showOwnedRing`, `searchQuery`, `searchMatchIds` down.
- Pass an `isSchemeMatching` callback (built from `colorScheme` + `selectedPaint`) once the wheel-side scheme matcher utility exists. If schemes are not yet wired into the container, leave the prop undefined — `HslColorWheel` should treat undefined as "no scheme dimming".

### Step 6 — UI toggles and search input

**New files:**

- `src/modules/color-wheel/hooks/use-wheel-display-state.ts`
- `src/modules/color-wheel/hooks/use-wheel-search.ts`

Both are local-state hooks that mirror `useWheelTransform`'s session-storage pattern. Keys: `color-wheel-display-state`, `color-wheel-search` (search query is **not** persisted across sessions; only the `showBrandRing` / `showOwnedRing` toggles are).

`useWheelSearch` returns `{ searchQuery, setSearchQuery, searchMatchIds }` and computes `searchMatchIds` lazily — a paint matches when its name, hex (with or without `#`), brand name, or product line name contains the query case-insensitively.

**Modify:** `src/modules/color-wheel/components/wheel-filters-panel.tsx`

Add three controls inside the open panel:

- A `<input type="text">` search box at the top (debounced via the consuming hook, not the input).
- Two toggle buttons under the existing filter sections:
  - "Show brand ring" → `showBrandRing`
  - "Show owned ring" → `showOwnedRing` (hidden when not authenticated, same gate as the existing `showOwnedFilter`)

These do not contribute to the active-filter chip count, since they are render toggles, not filters.

### Step 7 — In-panel collection toggle

**Modify:** `src/modules/color-wheel/components/paint-detail-panel.tsx`

Add a button row that:

- For authenticated users with the rep paint **not** in their collection: button text "Add to Collection", calls the existing add server action.
- For authenticated users with the rep paint already in their collection: button text "Remove from Collection", calls the existing remove server action.
- For unauthenticated users: hide the button.

Pass `userPaintIds` and the actions through from the container. After toggle, server-revalidation already refreshes the prop via the page; no local optimistic update needed unless a follow-up doc requests it.

The detail panel currently renders edge-to-edge — the button row goes below the existing `<dl>`, separated by a thin border, and uses `btn btn-primary` / `btn btn-outline btn-destructive` classes from `src/styles/`.

## Risks & Considerations

- **Brand ring visual noise.** Six brands per group becomes a thin rainbow band that's hard to read at low zoom. Recommendation: keep `BrandRingArcs` as-is for now (matches beta) and let the brand-ring toggle handle it — users who don't want noise turn it off. A future enhancement could collapse to a single neutral ring above N brands.
- **Group-by-hex dropping near-duplicates.** Two paints at `#FF5500` and `#FF5501` render as separate groups even though they're visually identical. The beta accepts this. If user feedback flags it, add a coarsening step (e.g., snap to 8-bit-per-channel) — out of scope here.
- **`PaintMarker` dual-use.** `MunsellColorWheel` still imports `PaintMarker`. Do not delete the file; trim it to only the props Munsell uses, or leave it untouched and ship `PaintDot` next to it. Confirm with `grep -r "from.*paint-marker" src/` before any deletion.
- **Scheme matcher surface area.** Today the wheel only renders scheme **wedge overlays** (`useWheelSchemeOverlays`). Per-paint scheme matching for dimming requires a small new utility (`isMatchingScheme(paintHue, refHue, scheme)` — the beta has it in `colorUtils.ts:101`). If the matcher isn't introduced as part of this refactor, ship without scheme-based dimming and add it in a follow-up.
- **Performance.** Beta runs at ~1500 paints with no virtualization; this project has the same order of magnitude. Group-by-hex typically reduces dot count by 20–40% so the refactor is net-positive on render cost. The Gaussian-blur filter on search rings is the most expensive piece — only render the filter element when `searchMatchIds.size > 0` to avoid empty-search overhead.
- **Selection ring radius depending on `showBrandRing`.** The radius formulas in the beta assume a fixed `r` based on multi/single. If `r` is later derived from zoom (`paint-marker.tsx` has commented-out `r / zoom` lines), the offsets need to recompute alongside it. Keep the offsets symbolic (`r + 4` etc.) rather than hardcoded numbers so zoom-aware radius is a single-line change.

## Verification

- Run `npm run build` and `npm run lint` — both must pass.
- Manual checks (HSL wheel only):
  - Page loads with paints grouped (visually fewer dots than rows in `paints`).
  - A two-brand color is wrapped by two arc segments in those brands' colors; a four-brand color shows four; a single-brand color shows a continuous half/half ring.
  - Toggling "Show brand ring" hides/shows the arcs without re-fetching.
  - Searching "blood" dims unrelated paints and gives matching dots a yellow glow.
  - Picking a color scheme on a selected paint dims paints outside the scheme, with extra dim on dots that are also outside any active search match.
  - Signing in and adding a paint to the collection produces a green halo on that group on the next render.
  - Selecting a multi-paint group opens the detail panel for the rep paint; the "Add/Remove from Collection" button toggles state.
- Type checking via `tsc --noEmit` (covered by `npm run build`).

## Beta Reference Mapping

For reviewers cross-checking parity with `grimify.app.beta`:

| Beta concept | Beta location | This refactor lands at |
| ------------ | ------------- | ---------------------- |
| `PaintGroup` type | `src/types/paint.ts` | `src/modules/color-wheel/types/paint-group.ts` |
| `usePaintGroups` | `src/hooks/useDerivedPaints.ts` | `utils/group-paints-by-hex.ts` (no React) |
| `BrandRingArcs` | `ColorWheel.tsx:30-79` | `components/brand-ring-arcs.tsx` |
| `PaintDot` | `ColorWheel.tsx:81-167` | `components/paint-dot.tsx` |
| `buildHueRingPath` | `ColorWheel.tsx:169-185` | reuses existing `utils/sector-path.ts` `annularSectorPath` |
| `isGroupDimmed` / `isGroupSchemeDimmed` | `src/utils/filterUtils.ts` | inline derivation in `hsl-color-wheel.tsx` (single call site, no shared util needed) |
| Search-glow `<filter>` | `ColorWheel.tsx:444` | `<defs>` in `hsl-color-wheel.tsx` |
| Selected-group "Add/Remove from Collection" button | `ColorWheel.tsx:626-654` | `paint-detail-panel.tsx` button row |
| Brand color from `brands.json` | `src/data/brands.json` | `utils/get-brand-color.ts` deterministic helper (until DB column exists) |
