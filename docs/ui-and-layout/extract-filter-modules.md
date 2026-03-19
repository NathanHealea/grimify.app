# Extract Filter Logic into Modules

**Epic:** UI & Layout
**Type:** Refactor
**Status:** Done

## Summary

Extract all filter-related logic from `page.tsx` into dedicated modules: utility functions, custom hooks, and UI components. Currently `page.tsx` contains ~170 lines of filter state, derived computations, and inline filter UI (brand filter buttons, color scheme buttons, brand ring toggle). This refactor moves filter logic into focused modules while keeping `page.tsx` as a layout compositor. This is a preparatory step that can be done independently of (and before) the full Zustand state management refactor documented in [state-management-refactor.md](./state-management-refactor.md).

## Acceptance Criteria

- [x] Filter utility functions (`matchesBrand`, `matchesSearch`, `matchesScheme`, `matchesOwned`, `getFilteredPaintCount`, `getFilteredColorCount`) are extracted to `src/utils/filterUtils.ts`
- [x] `useFilterState` hook manages all filter state (`brandFilter`, `searchQuery`, `colorScheme`, `ownedFilter`) with handlers
- [x] `useDerivedFilters` hook computes derived filter data (`searchResults`, `searchMatchIds`, `schemeMatches`, `isSchemeMatching`, filtered counts, `isAnyFilterActive`)
- [x] `BrandFilterPanel` component renders brand filter buttons with toggle logic
- [x] `ColorSchemePanel` component renders color scheme selector buttons with hint text
- [x] `BrandRingToggle` component renders the brand ring toggle button
- [x] `SearchBar` component encapsulates the search input with clear button
- [x] `StatsOverlay` component renders the filtered/total paint and color counts
- [x] `page.tsx` imports these modules instead of containing inline filter logic
- [x] All existing filter behavior works identically — no user-facing changes
- [x] Build and lint pass with no new warnings

## Design Notes

- **Why before Zustand:** This refactor is pure extraction — moving existing code into modules without changing the state management pattern. It makes the subsequent Zustand migration simpler because each module has clear boundaries. The hooks created here map directly to the Zustand stores planned in the state management refactor.
- **No state management change:** All state remains as `useState` in `page.tsx` and is passed as props. The hooks accept and return the same types. This is a structural refactor, not an architectural one.
- **Component boundaries:** Filter UI sections are extracted as components that receive state and callbacks as props. They're "dumb" components — no internal state management beyond what's component-specific.

## Implementation Plan

### Step 1: Create filter utility functions

Create `src/utils/filterUtils.ts` with pure functions extracted from the inline filter logic in `page.tsx` and the dimming logic duplicated in `ColorWheel.tsx` and `GridView.tsx`.

**Functions:**

```typescript
// Individual matchers (used in ColorWheel/GridView dimming and count calculations)
matchesBrandFilter(paint: ProcessedPaint, brandFilter: Set<string>): boolean
matchesSearchFilter(paint: ProcessedPaint, searchMatchIds: Set<string>): boolean
matchesOwnedFilter(paint: ProcessedPaint, ownedIds: Set<string>): boolean
matchesSchemeFilter(paint: ProcessedPaint, isSchemeMatching: (p: ProcessedPaint) => boolean): boolean

// Composite filter check
matchesAllFilters(paint: ProcessedPaint, filters: {
  brandFilter: Set<string>
  searchMatchIds: Set<string>
  isSchemeActive: boolean
  isSchemeMatching: (p: ProcessedPaint) => boolean
  ownedFilter: boolean
  ownedIds: Set<string>
}): boolean

// Count calculations
getFilteredPaintCount(processedPaints: ProcessedPaint[], filters: FilterState): number
getFilteredColorCount(paintGroups: PaintGroup[], filters: FilterState): number

// Search
searchPaints(processedPaints: ProcessedPaint[], query: string, brands: Brand[]): ProcessedPaint[]

// Scheme matching
getSchemeMatches(processedPaints: ProcessedPaint[], selectedPaint: ProcessedPaint | null, colorScheme: ColorScheme): ProcessedPaint[]
```

This consolidates the duplicated filter logic from `page.tsx` (lines 140-185), `ColorWheel.tsx`, and `GridView.tsx` into a single source of truth.

### Step 2: Create the `useFilterState` hook

Create `src/hooks/useFilterState.ts` — manages all filter-related `useState` and their handlers.

**Extracts from `page.tsx`:**
- `brandFilter` state + `handleBrandFilter` callback (lines 31, 187-200)
- `colorScheme` state + setter (line 32)
- `searchQuery` state + change/clear handlers (line 33)
- `ownedFilter` state + toggle handler (line 36)
- `showBrandRing` state + toggle (line 30)
- `showOwnedRing` state + toggle (line 35)

**Returns:**
```typescript
{
  // State
  brandFilter, colorScheme, searchQuery, ownedFilter, showBrandRing, showOwnedRing,
  // Handlers
  handleBrandFilter, setColorScheme, setSearchQuery, clearSearch,
  toggleOwnedFilter, toggleBrandRing, toggleOwnedRing,
  // Derived flags
  isFiltered, isSearching,
}
```

**Note:** `handleBrandFilter` and `toggleOwnedFilter` currently reset selection (`setSelectedGroup(null)`, `setSelectedPaint(null)`). These side effects will be handled by accepting `onSelectionReset` callback parameter, keeping the hook focused on filter state.

### Step 3: Create the `useDerivedFilters` hook

Create `src/hooks/useDerivedFilters.ts` — computes all filter-derived data via `useMemo`.

**Extracts from `page.tsx`:**
- `searchResults` + `searchMatchIds` (lines 106-115)
- `isSchemeMatching` callback (lines 121-130)
- `schemeMatches` (lines 132-135)
- `isSchemeActive`, `isAnyFilterActive` (lines 137-138)
- `filteredPaintCount` (lines 140-160)
- `filteredColorCount` (lines 162-185)

**Parameters:**
```typescript
useDerivedFilters({
  processedPaints: ProcessedPaint[]
  paintGroups: PaintGroup[]
  uniqueColorCount: number
  brandFilter: Set<string>
  searchQuery: string
  colorScheme: ColorScheme
  selectedPaint: ProcessedPaint | null
  ownedFilter: boolean
  ownedIds: Set<string>
})
```

**Returns:**
```typescript
{
  searchResults, searchMatchIds, schemeMatches, isSchemeMatching,
  isSchemeActive, isAnyFilterActive, filteredPaintCount, filteredColorCount,
}
```

Internally uses `searchPaints()` and `getSchemeMatches()` from `filterUtils.ts`.

### Step 4: Extract `SearchBar` component

Create `src/components/SearchBar.tsx` — the search input with clear button currently inline in `page.tsx` (lines 261-287).

**Props:**
```typescript
{
  searchQuery: string
  onSearchChange: (query: string) => void
  onClear: () => void
}
```

Extracts the `<label className='input input-sm w-full'>` block with the `MagnifyingGlassIcon`, input, and clear button.

### Step 5: Extract `BrandFilterPanel` component

Create `src/components/BrandFilterPanel.tsx` — brand filter buttons currently inline in `page.tsx` (lines 340-362).

**Props:**
```typescript
{
  brands: Brand[]
  brandFilter: Set<string>
  isFiltered: boolean
  onBrandFilter: (id: string) => void
}
```

Extracts the "All Brands" button and the per-brand toggle buttons with their styling logic.

### Step 6: Extract `ColorSchemePanel` component

Create `src/components/ColorSchemePanel.tsx` — color scheme selector currently inline in `page.tsx` (lines 367-394).

**Props:**
```typescript
{
  colorScheme: ColorScheme
  onSchemeChange: (scheme: ColorScheme) => void
  selectedPaint: ProcessedPaint | null
}
```

Extracts the scheme button list and the "Click a paint to see its X colors" hint.

### Step 7: Extract `BrandRingToggle` component

Create `src/components/BrandRingToggle.tsx` — the brand ring toggle button currently inline in `page.tsx` (lines 316-327).

**Props:**
```typescript
{
  showBrandRing: boolean
  onToggle: () => void
}
```

### Step 8: Extract `StatsOverlay` component

Create `src/components/StatsOverlay.tsx` — the stats display currently inline in `page.tsx` (lines 501-509).

**Props:**
```typescript
{
  totalPaints: number
  totalColors: number
  totalBrands: number
  filteredPaintCount: number
  filteredColorCount: number
  isAnyFilterActive: boolean
}
```

### Step 9: Refactor `page.tsx` to use extracted modules

Update `page.tsx` to import and use all extracted modules:

1. Replace inline filter state with `useFilterState()` hook
2. Replace inline derived computations with `useDerivedFilters()` hook
3. Replace inline search bar JSX with `<SearchBar />` component
4. Replace inline brand filter buttons with `<BrandFilterPanel />`
5. Replace inline color scheme buttons with `<ColorSchemePanel />`
6. Replace inline brand ring toggle with `<BrandRingToggle />`
7. Replace inline stats overlay with `<StatsOverlay />`
8. Remove unused imports (`MagnifyingGlassIcon`, `XMarkIcon`, `hexToHsl`, `isMatchingScheme`)

After refactoring, `page.tsx` should primarily contain:
- Selection state (`selectedGroup`, `selectedPaint`, `hoveredGroup`, `paintToRemove`)
- UI state (`sidebarState`, `lastTab`, `viewMode`, `zoom`, `pan`)
- Layout composition JSX
- Event handler wiring between components

### Step 10: Update `ColorWheel` and `GridView` to use `filterUtils`

Update the dimming logic in `ColorWheel.tsx` and `GridView.tsx` to use `matchesAllFilters()` from `filterUtils.ts` instead of duplicating the filter check inline. This is optional but reduces duplication.

### Affected Files

| File | Changes |
|------|---------|
| `src/utils/filterUtils.ts` | New — pure filter functions |
| `src/hooks/useFilterState.ts` | New — filter state management hook |
| `src/hooks/useDerivedFilters.ts` | New — derived filter computations hook |
| `src/components/SearchBar.tsx` | New — search input component |
| `src/components/BrandFilterPanel.tsx` | New — brand filter buttons component |
| `src/components/ColorSchemePanel.tsx` | New — color scheme selector component |
| `src/components/BrandRingToggle.tsx` | New — brand ring toggle component |
| `src/components/StatsOverlay.tsx` | New — stats display component |
| `src/app/page.tsx` | Major refactor — use extracted modules, remove inline logic |
| `src/components/ColorWheel.tsx` | Minor — use `filterUtils` for dimming (optional) |
| `src/components/GridView.tsx` | Minor — use `filterUtils` for dimming (optional) |

### Risks & Considerations

- **No behavior changes:** This is a pure extraction refactor. Every filter interaction must work identically. Test the search bar, brand filter toggles, color scheme buttons, owned filter, and stats display after refactoring.
- **Prop threading still exists:** This refactor does not eliminate prop drilling — it only organizes the code. Props still flow from `page.tsx` to child components. The subsequent Zustand migration (state-management-refactor.md) will eliminate prop drilling.
- **Selection reset side effect:** `handleBrandFilter` and `toggleOwnedFilter` currently reset selection state. The `useFilterState` hook handles this via a callback parameter to avoid coupling filter logic to selection state.
- **`isSchemeMatching` callback:** This is both a derived computation and a function passed as a prop to `ColorWheel`/`GridView`. It stays as a `useCallback` in the `useDerivedFilters` hook and is passed through.
- **Future alignment:** The modules created here map to the Zustand stores planned in state-management-refactor.md: `useFilterState` → `useFilterStore`, `useDerivedFilters` → `useFilteredPaints` hook, UI components stay as-is.
