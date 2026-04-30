# Filter Wheel by Brand, Collection, or Owned Paints

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Todo
**Branch:** `feature/wheel-filters`
**Merge into:** `v1/main`

## Summary

Add filter controls to the color wheel so users can narrow the displayed paints by brand, product line, paint type, or their personal collection. Filters apply to **both** wheel views (Munsell and HSL) — switching views preserves the active filter state.

## Acceptance Criteria

- [ ] Users can filter paints on the wheel by brand (multi-select)
- [ ] Users can filter by product line within selected brands
- [ ] Users can filter by paint type (base, layer, shade, etc.)
- [ ] Authenticated users can toggle to show only paints in their collection
- [ ] Filters can be combined (e.g., "Citadel base paints I own")
- [ ] Active filters are displayed and individually removable
- [ ] Filter state persists via URL search params
- [ ] Filters apply identically to both Munsell and HSL wheels; switching views preserves filter state
- [ ] `npm run build` and `npm run lint` pass with no errors

## Architecture

The two wheels (`MunsellColorWheel`, `HslColorWheel`) live under a single `ColorWheelContainer` which receives one `paints` array and renders whichever variant is selected. **Filtering happens in the container, before the paints array is passed down.** Neither wheel component needs to change — they continue to render whatever array they receive.

```
WheelPage (server)
  ├── fetches paints, hues, userPaintIds
  └── ColorWheelContainer (client)
        ├── useWheelFilters() ──► filter state + URL sync
        ├── applyWheelFilters(paints, filterState, userPaintIds) ──► filtered paints
        ├── WheelFiltersPanel ──► UI for editing filter state
        └── MunsellColorWheel | HslColorWheel  (receive filtered paints)
```

## Key Files

| Action | File                                                          | Description                                              |
| ------ | ------------------------------------------------------------- | -------------------------------------------------------- |
| Create | `src/modules/color-wheel/types/wheel-filter-state.ts`         | `WheelFilterState` shape (brands, product lines, types, collection toggle) |
| Create | `src/modules/color-wheel/hooks/use-wheel-filters.ts`          | Filter state + URL search-param sync (built on `useSearchUrlState`) |
| Create | `src/modules/color-wheel/utils/apply-wheel-filters.ts`        | Pure `(paints, filterState, userPaintIds?) → paints` filter |
| Create | `src/modules/color-wheel/utils/derive-filter-options.ts`      | Pure helper that derives the available brand / line / type options from the paint array |
| Create | `src/modules/color-wheel/components/wheel-filters-panel.tsx`  | Filter UI: brand multi-select, product-line dropdown, paint type toggles, "My collection" toggle, active-filter chips |
| Modify | `src/modules/color-wheel/types/color-wheel-paint.ts`          | Add `brand_id`, `product_line_id`, `paint_type` fields needed for filtering |
| Modify | `src/modules/paints/services/paint-service.ts`                | `getColorWheelPaints` selects + maps the new fields      |
| Modify | `src/modules/color-wheel/components/color-wheel-container.tsx` | Host the filters hook + panel; pass filtered paints to whichever wheel is active |
| Modify | `src/app/wheel/page.tsx`                                      | Fetch `userPaintIds` when authenticated; pass to container |

No changes to `MunsellColorWheel` or `HslColorWheel` themselves.

## Implementation

### 1. Extend `ColorWheelPaint`

**File:** `src/modules/color-wheel/types/color-wheel-paint.ts`

Add three fields needed by the filters (none of which break existing wheel rendering — they're consumed only by the filter logic):

```ts
export type ColorWheelPaint = {
  // ...existing fields
  brand_id: string
  product_line_id: string
  paint_type: string | null
}
```

Update `getColorWheelPaints` in `paint-service.ts` to select `paint_type`, `product_lines.id`, `product_lines.brands.id` and populate the new fields on the mapped row.

### 2. Filter state shape

**File:** `src/modules/color-wheel/types/wheel-filter-state.ts`

```ts
export type WheelFilterState = {
  brandIds: string[]            // selected brand IDs
  productLineIds: string[]      // selected product line IDs (further narrows brand selection)
  paintTypes: string[]          // selected paint types
  ownedOnly: boolean            // show only paints in the signed-in user's collection
}
```

A constant `EMPTY_FILTER_STATE: WheelFilterState` lives next to the type.

### 3. `useWheelFilters` hook

**File:** `src/modules/color-wheel/hooks/use-wheel-filters.ts`

Wraps `useSearchUrlState` (from `@/modules/paints/hooks/use-search-url-state`) so filter state survives reload, deep-linking, and Back/Forward.

URL params:

| Param      | Format             | Purpose                                  |
| ---------- | ------------------ | ---------------------------------------- |
| `brand`    | comma-separated    | Brand IDs                                |
| `line`     | comma-separated    | Product line IDs                         |
| `type`     | comma-separated    | Paint types                              |
| `owned`    | `1`                | Collection-only toggle                   |

History strategy: every key uses `'push'` so Back retraces filter changes (matches the paint explorer convention).

`hydrate(sp)` and `serialize(state)` follow the same shape as `paint-explorer.tsx`.

The hook returns:

```ts
{
  state: WheelFilterState
  setBrandIds(ids: string[]): void
  setProductLineIds(ids: string[]): void
  setPaintTypes(types: string[]): void
  setOwnedOnly(value: boolean): void
  clearAll(): void
  removeFilter(kind: 'brand' | 'line' | 'type' | 'owned', value?: string): void
}
```

`basePath: '/wheel'`. Each setter calls `update(...)` with `{ commit: true }`.

### 4. `applyWheelFilters` utility

**File:** `src/modules/color-wheel/utils/apply-wheel-filters.ts`

Pure synchronous filter, runs in the container on every render where state changes. Order is short-circuited cheapest-first:

```ts
export function applyWheelFilters(
  paints: ColorWheelPaint[],
  state: WheelFilterState,
  userPaintIds?: Set<string>,
): ColorWheelPaint[]
```

1. If `state.ownedOnly && userPaintIds`, drop paints whose `id` is not in `userPaintIds`. If `ownedOnly` is true but `userPaintIds` is undefined (unauthenticated), the filter is ignored — the toggle won't be visible to unauthenticated users anyway, but this guards a deep-linked `?owned=1` URL.
2. If `state.brandIds.length > 0`, keep only paints whose `brand_id` is in the set.
3. If `state.productLineIds.length > 0`, keep only paints whose `product_line_id` is in the set. (Combined with brand: a paint matches when its line is in `productLineIds` — the brand filter is implicit because product lines belong to brands. UI ensures `productLineIds` only contains lines from selected brands.)
4. If `state.paintTypes.length > 0`, keep only paints whose `paint_type` is in the set. Paints with `paint_type === null` are excluded when the type filter is active.

Memoize via `useMemo` in the container so re-renders without state change don't re-filter.

### 5. `deriveFilterOptions` utility

**File:** `src/modules/color-wheel/utils/derive-filter-options.ts`

Pure helper that walks the paint array once and returns:

```ts
{
  brands: { id: string; name: string }[]               // sorted by name
  productLines: { id: string; name: string; brand_id: string }[]
  paintTypes: string[]                                 // unique non-null types, sorted
}
```

Called once per `paints` reference change in the container, memoized.

### 6. `WheelFiltersPanel` component

**File:** `src/modules/color-wheel/components/wheel-filters-panel.tsx`

Props:

```ts
{
  state: WheelFilterState
  options: ReturnType<typeof deriveFilterOptions>
  isAuthenticated: boolean
  onChangeBrands(ids: string[]): void
  onChangeProductLines(ids: string[]): void
  onChangePaintTypes(types: string[]): void
  onChangeOwnedOnly(value: boolean): void
  onRemoveFilter(kind: 'brand' | 'line' | 'type' | 'owned', value?: string): void
  onClearAll(): void
}
```

Layout:
- Desktop (≥md): collapsible right-side panel anchored next to the wheel.
- Mobile: bottom sheet behind a "Filters" button so the wheel stays visible.

Sections inside the panel:
1. **Brands** — multi-select checkbox list (from `options.brands`).
2. **Product lines** — checkbox list filtered to lines whose `brand_id` is in `state.brandIds` (or all lines when no brand is selected). When a brand is unchecked, automatically drop any of its lines from `state.productLineIds` via `onChangeBrands` → caller-side cleanup logic.
3. **Paint types** — toggle chips (one per entry in `options.paintTypes`).
4. **My collection** — single toggle, only rendered when `isAuthenticated`.

Active-filter chip row sits above the wheel (always visible when any filter is active), each chip showing the human-readable label and an "×" that calls `onRemoveFilter`. A "Clear all" button appears when ≥2 filter values are active.

Use existing primitives from `src/components/ui/` and daisyUI-style classes (`btn`, `btn-sm`, `badge`, etc.) per project conventions.

### 7. Wire into `ColorWheelContainer`

**File:** `src/modules/color-wheel/components/color-wheel-container.tsx`

```tsx
export function ColorWheelContainer({
  paints,
  hues,
  userPaintIds,
  isAuthenticated,
}: {
  paints: ColorWheelPaint[]
  hues: ColorWheelHue[]
  userPaintIds?: Set<string>
  isAuthenticated: boolean
}) {
  const filters = useWheelFilters()
  const options = useMemo(() => deriveFilterOptions(paints), [paints])
  const filteredPaints = useMemo(
    () => applyWheelFilters(paints, filters.state, userPaintIds),
    [paints, filters.state, userPaintIds],
  )
  // ...existing view toggle...

  return (
    <div ...>
      <WheelFiltersPanel state={filters.state} options={options} ... />
      {/* existing Munsell/HSL toggle */}
      {view === 'munsell' ? (
        <MunsellColorWheel paints={filteredPaints} hues={hues} />
      ) : (
        <HslColorWheel paints={filteredPaints} />
      )}
    </div>
  )
}
```

Critical: the same `filteredPaints` array feeds both wheels, so toggling `view` keeps every active filter intact.

### 8. Fetch user collection IDs in the page

**File:** `src/app/wheel/page.tsx`

```tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
const isAuthenticated = !!user

const [paintService, hueService, collectionService] = await Promise.all([...])
const [paints, hues, userPaintIds] = await Promise.all([
  paintService.getColorWheelPaints(),
  hueService.getColorWheelHues(),
  user ? collectionService.getUserPaintIds(user.id) : Promise.resolve(undefined),
])

return (
  <ColorWheelContainer
    paints={paints}
    hues={hues}
    userPaintIds={userPaintIds}
    isAuthenticated={isAuthenticated}
  />
)
```

`getUserPaintIds` already exists at `src/modules/collection/services/collection-service.ts:29`.

## Risks & Considerations

- **Schema fields.** `paints.paint_type` is already on the table (used by `searchPaints`). `paints.product_line_id` and `product_lines.brand_id` exist via the existing `product_lines!inner(brands!inner(...))` join. No DB migration needed.
- **Bundle size.** `WheelFiltersPanel` should be a single client component, not split into many sub-components, to avoid bloating the initial wheel route.
- **Empty `paint_type`.** Some paints have `null` paint_type — they're dropped from the wheel only when the type filter is *active*; otherwise they render normally.
- **Deep-linked `?owned=1` for unauthenticated users.** `applyWheelFilters` ignores the toggle when `userPaintIds` is undefined; the panel hides the toggle. The URL param remains so signing in re-applies it.
- **Marker count after filtering.** Heavy filtering (e.g. one brand) can leave large empty regions. That's intended — no special "no results" state needed beyond the existing wheel rendering with an empty array.
- **URL hygiene.** `serialize` omits empty arrays / `false` booleans so the URL stays clean. Matches the paint-explorer convention.
- **Both wheels stay untouched.** Neither `MunsellColorWheel` nor `HslColorWheel` gains any filter awareness — the container is the only place filter state exists. This keeps the wheel components focused on rendering.
