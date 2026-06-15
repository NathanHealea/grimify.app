# Paint Explorer Filters (Brand, Paint Type, and more)

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Completed
**Branch:** `feature/paint-filters-brand-type`
**Merge into:** `main`

## Summary

Extend the public `/paints` explorer with additional filter dimensions alongside the existing hue filter. Today, the only way to narrow the catalog on this page is by Itten hue (parent + optional child) and a free-text query. Users have asked for the ability to filter by **brand** and **paint type**, and the underlying paint schema can support several more dimensions cheaply.

This feature ships an extensible, URL-synced multi-dimensional filter surface on `PaintExplorer`, mirroring the conventions established by the existing `HueFilterBar` and the v2 paint-search rearchitecture: per-option counts, AND across dimensions, OR within a dimension, and back/forward-friendly URL state.

## Why now

- The explorer is the primary catalog entry point and the most-trafficked route in the app outside the color wheel. With 6,000+ paints across 10+ brands, hue alone is too coarse a filter.
- The wheel already filters by brand / product line / paint type (`WheelFiltersPanel`). The `/paints` page does not, which creates an inconsistency: power-users find brand filtering on the wheel and then lose it on the catalog list.
- The Similar Paints section on every paint detail page (`PaintSimilarSection`) already has a tested brand + paint-type multi-select popover pattern that we can lift wholesale.
- The v2 search rearchitecture (`06-paint-search-v2.md`) deliberately left "Brand / paint-type / owned-vs-unowned facets" out of scope and called out that the `searchPaintsUnified` service was designed to be extended with facets later. This feature is that extension.

## What "filters" the schema supports

Filterable columns on `paints` and joined tables (see `src/types/paint.ts`):

| Dimension | Source | Cardinality | Ship in v1? |
|---|---|---|---|
| **Brand** | `paints → product_lines → brands.name / brands.id` | ~10–15 | **Yes** — explicit user ask. |
| **Paint type** | `paints.paint_type` (`'base' \| 'layer' \| 'shade' \| …`, nullable) | ~10–25 | **Yes** — explicit user ask. |
| **Product line** | `paints → product_lines.name / id` | ~30–50 | **Yes (gated by brand)** — only shown when ≥1 brand is selected, same convention as `WheelFiltersPanel`. |
| **Discontinued status** | `paints.is_discontinued` | 2 (true/false) | **Yes** — single tri-state toggle: include / exclude / only. Defaults to "include" (current behavior). |
| **Metallic** | `paints.is_metallic` | 2 | **Yes (cheap)** — single boolean chip. |
| Hue | `paints.hue_id` + parent/child hue | — | Already implemented via `HueFilterBar`. Composes with new filters. |
| Owned-only | scope to `user_paints` for current user | 2 | **Out of scope** — already wired into the wheel and the user's `/collection` page; revisit if user demand surfaces. |
| Hex similarity | `paints.r/g/b` distance | — | **Out of scope** — explicitly deferred to a future feature. |
| Saturation / lightness range | `paints.saturation`, `paints.lightness` | continuous | **Out of scope** — needs UI design (sliders). |

**v1 ships:** Brand, Paint Type, Product Line (brand-gated), Discontinued (tri-state), Metallic (boolean).
**Composes with existing:** Hue filter (parent + child), free-text query.

## Filter combination semantics

This is a deliberate, documented decision so the implementation is unambiguous:

- **AND across dimensions.** A paint must match every active dimension. e.g. `brand ∈ {Citadel, Vallejo} AND paint_type ∈ {layer, base} AND hue = red`.
- **OR within a dimension.** Multiple selections in the same dimension are unioned. e.g. selecting *Citadel* and *Vallejo* in the brand filter returns paints from either.
- **Empty dimension = no constraint.** A dimension with zero selections does not filter anything (it's identity, not "match nothing").
- **Free-text query AND filters.** The query (`q`) and the dimension filters are ANDed together — same as today's hue + query behavior in `searchPaintsUnified`.
- **Discontinued tri-state** has three states: `include` (no constraint — default), `exclude` (`is_discontinued = false`), `only` (`is_discontinued = true`). A single chip cycles through them.

## UX & component design

### Layout

The explorer keeps its current vertical rhythm. The new filter surface slots **above** the hue filter bar and **below** the search input + Clear All row, because:

1. Brand / type are coarser than hue for most painters (you usually know which brand you own).
2. Mobile screens: keeping the hue swatch row close to the grid preserves scannability.

```
[ search input ] [ Clear All ]
[ FilterBar — Brand · Type · Line · Discontinued · Metallic · active chips ]
[ HueFilterBar — parent pills ]
   [ child pills (when parent selected) ]
[ Paint grid ]
[ Pagination ]
```

### Filter trigger pattern

Reuse the **popover-with-checkbox-multiselect** pattern from `PaintSimilarSection` rather than the always-expanded checkbox panel from `WheelFiltersPanel`. Reasoning:

- The wheel panel is a side-rail on a graphic surface — vertical space is unconstrained.
- The `/paints` page is a list with paginated cards — we cannot afford a long expanded panel above the fold.
- The popover pattern keeps the filter row to a single line on desktop and a compact wrap on mobile, with badge counts on each trigger button announcing active selections.

For each dimension, render a `<Popover>` whose trigger looks like:

```
[ Brand ▾  ( 2 ) ]
```

When the popover opens, a scrollable list of checkboxes appears (max-height ~16rem, internal scroll). The list shows `option name · paint count` per row, mirroring the `huePaintCounts` pattern.

### Discontinued tri-state and metallic boolean

These are not popovers — they are inline single chips next to the popovers:

- **Discontinued**: cycles `Include discontinued` (subtle / unstyled) → `Hide discontinued` (`btn-outline`) → `Discontinued only` (`btn-primary`).
- **Metallic**: toggle chip `Metallic only`.

### Active filter chips row

When ≥1 dimension has selections, render a removable-chip row below the popover row (or to the right when space allows on desktop), styled identically to `PaintSimilarSection`'s `FilterChip`. Each chip shows `Brand: Citadel ✕`, `Type: Layer ✕`, etc.

### Empty state

When the combined filter+query returns zero paints, replace the grid with a panel matching the muted-border pattern in `PaintSimilarSection`:

```
[  No paints match the current filters.  ]
[  [ Clear all filters ]                 ]
```

The `Clear All` button (top-right) and the in-empty-state `Clear all filters` button share one handler that resets every dimension + the free-text query.

### Per-option counts

Counts shown on each row inside the popover follow the existing `huePaintCounts` SSR-prefetch convention: **the page component computes counts once on the server and passes them to the client component as `Record<id, number>` maps.** Counts are computed against the **current state of all OTHER active filters** — i.e. the count next to *Citadel* in the Brand popover reflects how many Citadel paints would match if the user added that brand to the existing selection of paint types, hues, etc.

That "filter-aware" recount means counts must be re-derived on the client whenever any filter changes. Two viable strategies:

- **(A) Server-recompute on every URL change** — re-fetch the page on the server. Adds a network round-trip per filter click.
- **(B) Client-derive from a pre-fetched aggregate** — SSR ships a sparse facet aggregate keyed by `(brand, type, line, hue)` tuples and the client narrows it on each filter change. Faster but more complex and memory-heavy.

**v1 picks (A)** — simplicity over latency. The `useSearchUrlState` hook already forces a server round-trip via the URL change being mirrored back to the next paginated fetch. We piggyback on that: when filters change, the smart container re-derives counts from a separate `getPaintFacetCounts` service call (one round-trip, runs in parallel with the paint fetch). This is consistent with how `useHueFilter` lazily fetches child-hue counts when a parent is selected (`use-hue-filter.ts:86-92`).

If perf testing shows facet-count latency causing visible jank, we can flip to strategy (B) in a follow-on PR without changing the URL contract or the component API.

## URL state contract

The existing explorer URL uses:

```
/paints?q=…&hue=parent[,child]&page=N&size=M
```

Extended URL contract (each new param keyed `'push'` in `useSearchUrlState` so Back retraces filter clicks):

| Param | Type | Meaning | Default (omitted) |
|---|---|---|---|
| `q` | string | Free-text query (existing) | `''` |
| `hue` | `parent` or `parent,child` (existing) | Hue filter (existing) | `''` |
| `brand` | comma-separated brand IDs | OR within | `''` (no constraint) |
| `type` | comma-separated paint-type strings, lowercased | OR within | `''` (no constraint) |
| `line` | comma-separated product-line IDs | OR within; gated by brand | `''` |
| `disc` | one of `include` / `exclude` / `only` | Discontinued tri-state | `include` (omitted) |
| `metal` | `1` for metallic-only | Boolean | omitted |
| `page` | number (existing) | 1-based page | `1` |
| `size` | one of 25/50/100/200 (existing) | Page size | `50` |

**URL design rules:**

- Use **IDs** for `brand` and `line` (stable, short, language-independent). Use **string values** for `type` (already low-cardinality strings, easier to debug, no extra lookup at SSR time). Mirrors the heterogeneous approach `WheelFiltersPanel` already takes with `brandIds` + `paintTypes`.
- Omit defaults to keep shareable URLs short.
- Multi-select dimensions use **comma-separated** values, mirroring the existing `hue=parent,child` precedent. URL-encoding handles spaces in paint-type values.

**Shareable-URL example:**

```
/paints?q=red&brand=1,3&type=layer,base&hue=red&disc=exclude&size=100
```

## Domain module scope

This feature is contained inside the existing **`paints`** module. Cross-module reads:

- `src/modules/brands/services/brand-service.ts` → `getAllBrands` for the brand option list (already exported; called from the page).
- `src/modules/paints/services/paint-service.ts` → `listDistinctPaintTypes` (already exists, line 616) for the paint-type option list.

No new modules. No code is added under `src/app/`.

### Affected files

| # | File | Role | Change |
|---|------|------|--------|
| 1 | `src/modules/paints/types/paint-filter-state.ts` | **new type** | `PaintFilterState` shape covering all new dimensions; the canonical type passed between the smart container and the `PaintFilterBar`. |
| 2 | `src/modules/paints/types/paint-facet-counts.ts` | **new type** | `PaintFacetCounts` — maps keyed by ID/value: `{ brand: Record<string, number>, type: Record<string, number>, line: Record<string, number> }`. |
| 3 | `src/modules/paints/services/paint-service.ts` | service | Extend `searchPaintsUnified` options with `brandIds?: number[]`, `paintTypes?: string[]`, `productLineIds?: number[]`, `discontinued?: 'include' \| 'exclude' \| 'only'`, `metallicOnly?: boolean`. Add a new method `getPaintFacetCounts(filters)` that returns per-option counts respecting all *other* active filters. |
| 4 | `src/modules/paints/actions/search-paints.ts` | action | Forward the new filter options through to the service. |
| 5 | `src/modules/paints/actions/get-paint-facet-counts.ts` | **new action** | Server-action wrapper around the new service method so the client can refresh counts without going direct-to-Supabase from the browser. |
| 6 | `src/modules/paints/hooks/use-paint-filters.ts` | **new hook** | Owns the new dimensions' selection state (brand / type / line / discontinued / metallic), exposes setters, derives a serializable shape, and accepts hydration from the URL. Composes alongside `useHueFilter` — does not absorb it. |
| 7 | `src/modules/paints/hooks/use-paint-facet-counts.ts` | **new hook** | Refetches `getPaintFacetCounts` whenever filters change, with `AbortController` cancellation. Returns `{ counts, isLoading }`. |
| 8 | `src/modules/paints/hooks/use-paint-search.ts` | hook | Pass the new filter args through to `searchPaints` (no logic change, just plumbing). |
| 9 | `src/modules/paints/components/paint-filter-bar.tsx` | **new component** | Presentational filter row: Brand popover + Type popover + Line popover (brand-gated) + Discontinued chip + Metallic chip + active-chip row. Pure props — no state, no fetching. |
| 10 | `src/modules/paints/components/paint-filter-popover.tsx` | **new component** | Internal reusable popover-with-checkbox-multiselect, parameterized over `{ label, options, counts, selectedIds, onToggle }`. Used by Brand, Type, and Line. Lives next to `paint-filter-bar.tsx`. |
| 11 | `src/modules/paints/components/paint-explorer.tsx` | smart container | Add new dimensions to `ExplorerUrlState`, `hydrate`, `serialize`, the `useSearchUrlState` keys map, and the `usePaintSearch` call. Insert `<PaintFilterBar>` between the search row and `<HueFilterBar>`. Wire the new handlers and extend `handleClearAll`. Update `hasActiveFilters`. Add empty-state branch when `paints.length === 0`. |
| 12 | `src/app/paints/page.tsx` | route page | Parse the new search params; pre-fetch the brand list (`getBrandService().getAllBrands()`), the paint-type list (`paintService.listDistinctPaintTypes()`), and an initial facet-counts snapshot. Pass them as new props to `<PaintExplorer>`. Pass the full filter args into the initial `searchPaintsUnified` call so SSR honours filter state from the URL. |

No changes to `HueFilterBar`, `paint-grid.tsx`, `pagination-controls.tsx`, `use-hue-filter.ts`, or `use-search-url-state.ts`.

## Implementation Plan

Phased so each phase is self-contained, ships green types/lint, and can be split into a small PR if scope changes.

### Phase 1 — Service & action surface

**Goal:** Extend the data layer first so every later phase can call into a stable API.

1. Add `src/modules/paints/types/paint-filter-state.ts`:
   ```ts
   /**
    * URL-synced filter state for the public paint explorer, excluding the
    * existing hue and query state which are owned by useHueFilter and the
    * search input respectively.
    */
   export type PaintFilterState = {
     brandIds: number[]
     paintTypes: string[]
     productLineIds: number[]
     discontinued: 'include' | 'exclude' | 'only'
     metallicOnly: boolean
   }

   /** Neutral starting state for {@link PaintFilterState}. */
   export const EMPTY_PAINT_FILTER_STATE: PaintFilterState = {
     brandIds: [],
     paintTypes: [],
     productLineIds: [],
     discontinued: 'include',
     metallicOnly: false,
   }
   ```
2. Add `src/modules/paints/types/paint-facet-counts.ts`:
   ```ts
   /**
    * Per-option paint counts for each filter dimension, given a current filter
    * context. Computed by counting paints matching all OTHER active filters
    * holding that dimension out.
    */
   export type PaintFacetCounts = {
     brand: Record<string, number>     // keyed by brand.id (stringified)
     type: Record<string, number>      // keyed by lowercased paint_type
     line: Record<string, number>      // keyed by product_line.id (stringified)
   }
   ```
3. In `src/modules/paints/services/paint-service.ts`, extend `searchPaintsUnified` to accept the new filter options. The current method already builds a chained Supabase query in two paths (browse vs search); fold the new filters into both paths uniformly:
   - `brandIds`: chain `.in('product_lines.brand_id', brandIds)` using the existing `product_lines!inner` join (already present in the search-path; promote the join to `!inner` in the browse-path).
   - `paintTypes`: handle the `Untyped`/null sentinel up front, otherwise `.in('paint_type', paintTypes)`. For mixed null + value cases, fall back to `.or('paint_type.in.(...),paint_type.is.null')`.
   - `productLineIds`: `.in('product_line_id', productLineIds)`.
   - `discontinued`: `'exclude'` → `.eq('is_discontinued', false)`, `'only'` → `.eq('is_discontinued', true)`, `'include'` → no-op.
   - `metallicOnly`: when `true`, `.eq('is_metallic', true)`.
   - JSDoc all new options.
4. Add a new service method `getPaintFacetCounts(filters: { query?, hueIds?, brandIds?, paintTypes?, productLineIds?, discontinued?, metallicOnly? }): Promise<PaintFacetCounts>`:
   - Internally calls `searchPaintsUnified` three times (one per facet dimension), each call holding out the facet being counted. Each invocation uses `count: 'exact', head: true` per-option — see the existing `getPaintCountsByHue` pattern (`paint-service.ts:246-257`) for the per-option count idiom.
   - For brand counts: load `getAllBrands()` once, then for each brand call a count query with all current filters AND `brand_id = thisBrand.id`.
   - For type counts: load `listDistinctPaintTypes()`, then per-type count with `paint_type = thisType`.
   - For line counts: only compute if ≥1 brand is selected (matches the brand-gated UI). Load product lines for selected brands, then per-line count.
   - Run all per-option counts in parallel via `Promise.all` to keep latency to a single round-trip wall-clock.
5. Forward new params through `src/modules/paints/actions/search-paints.ts`.
6. Add `src/modules/paints/actions/get-paint-facet-counts.ts` (server action) that calls the new service method.

**Files touched:** 2 new type files, 1 service edit, 1 action edit, 1 new action.

**Verification:** `npx tsc --noEmit`. Smoke test the service from a temporary route handler if needed; no UI yet.

### Phase 2 — Hooks

**Goal:** Encapsulate state and fetching for the new dimensions, keeping the smart container thin.

1. `src/modules/paints/hooks/use-paint-filters.ts`:
   - Signature: `usePaintFilters(options: { initial: PaintFilterState }): { state: PaintFilterState; toggleBrand(id); togglePaintType(name); toggleProductLine(id); cycleDiscontinued(); toggleMetallicOnly(); setState(next); clear(); }`.
   - When the brand selection changes, prune `productLineIds` to lines belonging to currently-selected brands (read the SSR-supplied brand → line map). This prevents stale-line URLs after a brand toggle.
   - JSDoc per `CLAUDE.md`.
2. `src/modules/paints/hooks/use-paint-facet-counts.ts`:
   - Signature: `useFacetCounts(params: { query?; hueIds?; filters: PaintFilterState; initialCounts?: PaintFacetCounts }): { counts: PaintFacetCounts; isLoading: boolean }`.
   - Calls `getPaintFacetCounts` action under `AbortController`, mirroring `usePaintSearch`'s last-request-wins pattern. Falls back to `initialCounts` (SSR-prefetched) on first render.
3. `src/modules/paints/hooks/use-paint-search.ts`:
   - Extend `params` with `filters?: PaintFilterState`. Forward into the `searchPaints` action call. No other logic changes.

**Files touched:** 2 new hooks, 1 edit.

**Verification:** Types compile. Hooks render-only test by importing into `paint-explorer.tsx` and console-logging in dev — no behavior change yet.

### Phase 3 — Presentational components

**Goal:** Build the filter bar without wiring it to the explorer yet.

1. `src/modules/paints/components/paint-filter-popover.tsx`:
   - Internal reusable. Props: `{ label: string; options: { id: string; name: string }[]; counts: Record<string, number>; selectedIds: string[]; onToggle: (id: string) => void; emptyMessage?: string; disabled?: boolean }`.
   - Renders a Radix `Popover` with a `btn btn-outline btn-sm` trigger showing `label ▾  ( N )` (N hidden when 0). Content is a scrollable `<ul>` of `<label>` + `<input type="checkbox">` rows showing `name` left-aligned and `count` muted, right-aligned.
   - Disabled state collapses the trigger to muted-foreground and prevents the popover from opening (used by Line when no brand selected).
   - Copy the styling tokens verbatim from `PaintSimilarSection` (lines 178-251) so the visual language is identical.
2. `src/modules/paints/components/paint-filter-bar.tsx`:
   - Dumb. Props:
     ```ts
     type PaintFilterBarProps = {
       state: PaintFilterState
       counts: PaintFacetCounts
       brands: { id: number; name: string }[]
       paintTypes: string[]
       productLines: { id: number; brand_id: number; name: string }[]
       onToggleBrand: (id: number) => void
       onTogglePaintType: (name: string) => void
       onToggleProductLine: (id: number) => void
       onCycleDiscontinued: () => void
       onToggleMetallicOnly: () => void
       onRemoveFilter: (kind: 'brand' | 'type' | 'line' | 'disc' | 'metal', value?: string | number) => void
     }
     ```
   - Renders: three `<PaintFilterPopover>`s, the two single chips, then a wrap row of removable active-filter chips reproducing the `FilterChip` from `PaintSimilarSection`.
   - The Line popover is `disabled` when `state.brandIds.length === 0` and lists only product lines whose `brand_id` is in `state.brandIds` otherwise.
   - JSDoc each export, no internal state, no fetching.

**Files touched:** 2 new components.

**Verification:** Render `<PaintFilterBar>` from a scratch route or Storybook-style harness; confirm visual parity with `PaintSimilarSection`. No URL hookup yet.

### Phase 4 — Wire into `PaintExplorer` + route page

**Goal:** Bring the filters live. This is the only phase that produces user-visible behavior.

1. Update `ExplorerUrlState` in `paint-explorer.tsx`:
   ```ts
   type ExplorerUrlState = {
     q: string
     hue: string
     brand: string      // comma-separated ids
     type: string       // comma-separated lowercased names
     line: string       // comma-separated ids
     disc: 'include' | 'exclude' | 'only'
     metal: '0' | '1'
     page: number
     size: number
   }
   ```
   - Extend `hydrate` / `serialize` accordingly, omitting empties to keep URLs short.
   - Mark each new key as `'push'` in the `useSearchUrlState` `keys` map.
2. Hydrate `PaintFilterState` from `state.brand / .type / .line / .disc / .metal` once, pass into `usePaintFilters({ initial })`. Mirror the existing `useMemo` pattern that converts `state.hue` into `(initialParentName, initialChildName)` for `useHueFilter`.
3. Pass `state.q`, `hueFilter`-derived `hueIds`, and the new `PaintFilterState` into `usePaintSearch`.
4. Pass the same arguments into `useFacetCounts` (with SSR `initialCounts` from props).
5. Insert `<PaintFilterBar>` above `<HueFilterBar>`. Wire each `on*` callback to call both the local `usePaintFilters` toggler AND `update(...)` to push the new param to the URL (mirroring `handleSelectParent` / `handleSelectChild`).
6. Extend `handleClearAll` to reset all new dimensions in addition to query and hue. Extend `hasActiveFilters` to include the new dimensions.
7. Add an empty-state branch: when `paints.length === 0`, render the muted-border panel + Clear-all-filters button between the grid and pagination (or in place of the grid). Pagination stays mounted but disabled.
8. In `src/app/paints/page.tsx`:
   - Parse all new search params and validate enums (e.g. `disc` falls back to `'include'`).
   - In parallel with the existing hue fetch:
     - `brandService.getAllBrands()` → strip down to `{ id, name }[]` for the client component.
     - `paintService.listDistinctPaintTypes()` → already returns sorted strings.
     - For product lines: `brandService.getAllBrandsWithProductLines()` flattened to `{ id, brand_id, name }[]`.
     - `paintService.getPaintFacetCounts({ query, hueIds, ...filters })`.
   - Pass the SSR `searchPaintsUnified` call the new filter args so the first paint of HTML matches the URL.
   - Add new props to `<PaintExplorer>`: `brands`, `paintTypes`, `productLines`, `initialFilters`, `initialFacetCounts`.

**Files touched:** `paint-explorer.tsx`, `app/paints/page.tsx`.

**Manual verification:**
- Pick one brand from the popover → grid updates, URL gets `?brand=1`, Back returns to no-filter state.
- Add a paint type, then a hue → all three compose (AND); count badges on each trigger update accurately.
- Open the Line popover with no brand → it's disabled. Pick a brand, then Line lists only that brand's product lines.
- Cycle the Discontinued chip through `include → exclude → only → include`. URL toggles `disc=…`.
- Toggle Metallic only. Combine with `q=red`. Confirm chip row shows all active filters.
- Copy URL with `?q=red&brand=1,3&type=layer&disc=exclude` to a new tab → page hydrates to that exact state.
- Filter combination with zero results → empty-state panel renders, Clear-all-filters button resets everything.

### Phase 5 — Cleanup & docs

1. JSDoc every new export per `CLAUDE.md` conventions.
2. Verify zero new `tsc --noEmit` or `npm run lint` errors.
3. Update `src/app/paints/page.tsx`'s `metadata.description` to advertise the new capability ("Filter by brand, type, hue…").
4. Update the existing `getPaintFacetCounts` doc-comment to reference this feature.
5. Add a short note to `src/modules/paints/types/paint-filter-state.ts` cross-linking the URL contract.

## Acceptance Criteria

- [x] Brand multi-select popover on `/paints` filters the grid; URL reflects `?brand=<comma-sep IDs>`.
- [x] Paint type multi-select popover filters the grid; URL reflects `?type=<comma-sep values>`.
- [x] Product line popover is disabled when no brand is selected, lists only product lines for the selected brand(s) when ≥1 brand is selected, and filters via `?line=<comma-sep IDs>`.
- [x] Discontinued tri-state chip cycles `include / exclude / only` and writes `?disc=…` (omitted when `include`).
- [x] Metallic-only chip toggles `?metal=1`.
- [x] All new filters AND with each other and with the existing hue + query filters; multiple selections within one dimension OR.
- [x] Per-option counts shown on each popover row reflect the result count if that option were added to the current filter set (filter-aware counts).
- [x] Active-filter chip row below the popovers lets users remove any single filter.
- [x] Clear All resets every dimension + the query.
- [x] When zero paints match, an empty-state panel renders with a single Clear-all-filters button.
- [x] Shareable URL with all filter params hydrates the UI to that exact state on first paint (SSR).
- [x] Back / Forward navigates through filter changes correctly (each filter change is a `pushState` entry).
- [x] No new TypeScript or lint errors.
- [x] All new exports have JSDoc per `CLAUDE.md`.

## Risks & Considerations

- **Per-option count latency.** The strategy-A approach issues `O(brands + types + selectedBrandLines)` count queries per filter change. Mitigations: parallel execution, `count: 'exact', head: true` (no row data), and `AbortController` so user-typing/clicking doesn't queue stale work. If profiling shows >300 ms median, flip to strategy B (client-side narrowing of a SSR aggregate) without breaking the URL contract.
- **`product_lines!inner` promotion in the browse-path of `searchPaintsUnified`.** Today the browse-path does `product_lines(brands(name))` (left join) while the search-path does `product_lines!inner(brands(name))`. Promoting the browse-path to `!inner` is safe because every paint has a `product_line_id` (NOT NULL FK), but verify with a count smoke test before/after the change.
- **`paint_type` is nullable.** The "Untyped" sentinel needs to be exposed in the popover when at least one paint has `paint_type IS NULL`. Use the `UNTYPED_PAINT_TYPE = 'Untyped'` sentinel already defined in `src/modules/paints/types/similar-paints-filter-state.ts` — re-export from `paint-filter-state.ts` rather than defining a parallel value.
- **Filter ID stability.** Brand and product-line filters use database IDs in the URL. If IDs ever change (e.g. data re-seed), prior shared links break. Acceptable trade-off — names contain spaces and we don't want a slug lookup per filter row.
- **`hue` URL contract collision.** The new keys (`brand`, `type`, `line`, `disc`, `metal`) don't overlap with the existing `q`, `hue`, `page`, `size`, but verify no other route handler consumes these (`grep -r "searchParams" src/app/paints`).
- **Wheel/explorer behavior drift.** `WheelFiltersPanel` uses brand/line/type filtering in `WheelFilterState`, but with a different shape (stringified IDs, no tri-state for discontinued). We are not unifying them in this feature — that would be a cross-domain refactor. Document the divergence in JSDoc on `PaintFilterState` so future work can consolidate.
- **Mobile width.** Five popover triggers + two chips + the active-chip row can wrap awkwardly on narrow screens. Use `flex flex-wrap gap-2` on the bar wrapper and verify on a 360px viewport. If still cramped, consider collapsing all triggers into a single "Filters" `Sheet` on mobile (out of scope for v1; flag as a follow-up).
- **Cross-domain UI audit alignment.** `docs/13-application-improvements/02-cross-domain-ui-audit.md` (Section 4.2) recommends extracting an `EmptyState` primitive. This feature's empty-state markup should be implemented inline using the audit's proposed copy + classes, so the eventual `EmptyState` extraction can swap it out with a one-line change. Do **not** scaffold `EmptyState` here — that belongs to the audit's follow-up doc.

## Out of Scope

- Hex-similarity / "find paints like this color" search.
- Saturation / lightness range filters (slider UI not designed yet).
- "My collection only" toggle on `/paints` — already provided on `/collection` and on the wheel.
- Sort options (alphabetical, by hue, by brand). Sort stays at "by name" until a separate feature ships.
- Mobile bottom-sheet redesign for the filter bar.
- Unifying `WheelFilterState` and `PaintFilterState` into a single canonical type — cross-domain refactor.
- Tests: the project has no test framework configured (`CLAUDE.md` → `## Testing`), so verification is manual per the Phase-4 checklist.
