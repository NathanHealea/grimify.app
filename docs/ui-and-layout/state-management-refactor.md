# Improve Application State Management

**Epic:** UI & Layout
**Type:** Refactor
**Status:** Completed

## Summary

Refactor the application's state management from centralized `useState` in `page.tsx` with prop drilling to Zustand stores. The current `page.tsx` holds 15+ state variables and passes them through deep prop chains to 6+ components. This refactor extracts state into focused Zustand stores, eliminates prop drilling, and establishes a clean pattern for future features (database-backed collections, user auth, palettes) to plug into.

## Acceptance Criteria

- [x] Zustand is installed as a dependency
- [x] Paint store manages selection state (selectedGroup, selectedPaint, hoveredGroup) and view mode
- [x] Filter store manages all filter state (brandFilter, searchQuery, colorScheme, ownedFilter)
- [x] UI store manages sidebar state (sidebarState, lastTab) and display toggles (showBrandRing, showOwnedRing)
- [x] `page.tsx` no longer holds filter, selection, or UI state — only composes components
- [x] All components consume state directly from stores instead of receiving props
- [x] Derived data (processedPaints, paintGroups, searchResults, schemeMatches, filteredCounts) is computed via Zustand selectors or co-located `useMemo` hooks
- [x] `useOwnedPaints` hook continues to manage localStorage persistence (migrated to a Zustand store with persist middleware)
- [x] All existing functionality works identically — no user-facing behavior changes
- [x] Build and lint pass with no new warnings

## Design Notes

- **Why Zustand over Context:** Context re-renders all consumers on any state change. Zustand's selector model (`useStore(state => state.x)`) only re-renders when the selected slice changes, which matters for high-frequency updates like hover state.
- **Why not Redux/Jotai/other:** Zustand is the simplest option with the least boilerplate. No providers, no actions/reducers, just functions. It matches the project's "keep it simple" philosophy.
- **Store boundaries:** Split by domain (paint data, filters, UI chrome) rather than by component. This keeps stores stable as new views (list view, future pages) are added.
- **Persist middleware:** Zustand's built-in `persist` middleware replaces the manual localStorage logic in `useOwnedPaints`, giving automatic hydration and serialization.

## File Structure

```
src/
  stores/
    usePaintStore.ts         # New — selection, hover, view mode
    useFilterStore.ts        # New — brand filter, search, color scheme, owned filter
    useUIStore.ts            # New — sidebar state, display toggles
    useCollectionStore.ts    # New — owned paint IDs with persist middleware
  hooks/
    useOwnedPaints.ts        # Removed — replaced by useCollectionStore
    useDerivedPaints.ts      # New — processedPaints, paintGroups, derived computations
    useFilteredPaints.ts     # New — searchResults, schemeMatches, filteredCounts
  app/
    page.tsx                 # Modified — stripped down to layout composition
  components/
    ColorWheel.tsx           # Modified — reads from stores directly
    GridView.tsx             # Modified — reads from stores directly
    DetailPanel.tsx          # Modified — reads from stores directly
    CollectionPanel.tsx      # Modified — reads from stores directly
    BrandLegend.tsx          # Modified — reads from stores directly
    Sidebar.tsx              # Unchanged (already minimal)
```

## Implementation Plan

### Step 1: Install Zustand

Install `zustand` as a dependency.

```bash
npm install zustand
```

### Step 2: Create the collection store (useCollectionStore)

Create `src/stores/useCollectionStore.ts`.

This replaces `src/hooks/useOwnedPaints.ts` with Zustand's `persist` middleware for automatic localStorage sync.

**State:**
- `ownedIds: Set<string>` — set of owned paint IDs

**Actions:**
- `toggleOwned(paintId: string)` — add or remove a paint ID from the set

**Middleware:**
- `persist` with `storage` key `'colorwheel-owned-paints'` and custom `serialize`/`deserialize` to handle the `Set` type (convert to/from array)

**Pattern:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CollectionState {
  ownedIds: Set<string>
  toggleOwned: (paintId: string) => void
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set) => ({
      ownedIds: new Set<string>(),
      toggleOwned: (paintId) =>
        set((state) => {
          const next = new Set(state.ownedIds)
          if (next.has(paintId)) next.delete(paintId)
          else next.add(paintId)
          return { ownedIds: next }
        }),
    }),
    {
      name: 'colorwheel-owned-paints',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          return { ...parsed, state: { ...parsed.state, ownedIds: new Set(parsed.state.ownedIds) } }
        },
        setItem: (name, value) => {
          const serialized = { ...value, state: { ...value.state, ownedIds: [...value.state.ownedIds] } }
          localStorage.setItem(name, JSON.stringify(serialized))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
```

**Migration note:** The existing `useOwnedPaints` hook stores owned IDs as a JSON array under key `'colorwheel-owned-paints'`. The new store's custom `getItem` should handle both the old format (raw array) and the new Zustand persist format (wrapped object) so existing users don't lose their collections.

### Step 3: Create the filter store (useFilterStore)

Create `src/stores/useFilterStore.ts`.

**State:**
- `brandFilter: Set<string>` — active brand filter IDs (empty = all brands)
- `searchQuery: string` — search input text
- `colorScheme: ColorScheme` — active scheme mode
- `ownedFilter: boolean` — show only owned paints

**Actions:**
- `toggleBrand(id: string)` — toggle a brand in the filter set; if `id === 'all'`, clear the set
- `setSearchQuery(query: string)` — update search query
- `setColorScheme(scheme: ColorScheme)` — update color scheme
- `toggleOwnedFilter()` — toggle owned filter on/off
- `clearFilters()` — reset all filters to defaults

**Derived (as getters or external selectors):**
- `isFiltered` — `brandFilter.size > 0`
- `isSearching` — `searchQuery.trim().length > 0`

### Step 4: Create the paint store (usePaintStore)

Create `src/stores/usePaintStore.ts`.

**State:**
- `selectedGroup: PaintGroup | null`
- `selectedPaint: ProcessedPaint | null`
- `hoveredGroup: PaintGroup | null`
- `viewMode: 'wheel' | 'grid'`
- `paintToRemove: ProcessedPaint | null`

**Actions:**
- `setHoveredGroup(group: PaintGroup | null)` — update hover state
- `selectGroup(group: PaintGroup | null)` — handle group click logic (toggle selection, auto-select single paint, clear scheme on deselect). Reads `colorScheme` from filter store to reset it on deselect.
- `selectPaint(paint: ProcessedPaint, group: PaintGroup)` — select a specific paint within a group
- `selectSearchResult(paint: ProcessedPaint, paintGroups: PaintGroup[])` — find the group for a paint and select both
- `setViewMode(mode: 'wheel' | 'grid')` — switch view
- `setPaintToRemove(paint: ProcessedPaint | null)` — set/clear remove confirmation
- `clearSelection()` — clear selectedGroup, selectedPaint, and reset colorScheme

**Cross-store interaction:** When `selectGroup(null)` is called, it should also call `useFilterStore.getState().setColorScheme('none')` to reset the scheme. Zustand supports this via `getState()` outside of React.

### Step 5: Create the UI store (useUIStore)

Create `src/stores/useUIStore.ts`.

**State:**
- `sidebarState: SidebarTab | 'closed' | null`
- `lastTab: SidebarTab` (default: `'filters'`)
- `showBrandRing: boolean`
- `showOwnedRing: boolean`
- `zoom: number` (default: 1)
- `pan: { x: number; y: number }` (default: `{ x: 0, y: 0 }`)

**Actions:**
- `toggleTab(tab: SidebarTab)` — toggle sidebar tab open/closed
- `toggleMenu()` — toggle sidebar visibility
- `closeSidebar()` — explicitly close sidebar
- `toggleBrandRing()` — toggle brand ring display
- `toggleOwnedRing()` — toggle owned ring display
- `setZoom(zoom: number)` — update zoom level
- `setPan(pan: { x: number; y: number })` — update pan offset
- `resetView()` — reset zoom and pan to defaults

**Note:** `effectiveTab` derivation (accounting for `isDesktop`) stays in the component layer since it depends on the `useIsDesktop()` hook which uses browser APIs.

### Step 6: Create derived data hooks

Create `src/hooks/useDerivedPaints.ts` — extracts the memoized computations currently in `page.tsx`.

**Exports:**
- `useProcessedPaints()` — returns `processedPaints: ProcessedPaint[]`. Runs `processPaint()` on raw paint data. Pure computation, no store dependency.
- `usePaintGroups(processedPaints)` — returns `paintGroups: PaintGroup[]`. Groups by hex.
- `useBrandPaintCounts(processedPaints)` — returns `Map<string, number>`.

Create `src/hooks/useFilteredPaints.ts` — extracts filter-dependent computations.

**Exports:**
- `useSearchResults(processedPaints)` — reads `searchQuery` from filter store, returns `{ searchResults, searchMatchIds }`.
- `useSchemeMatching()` — reads `selectedPaint` and `colorScheme` from stores, returns `{ isSchemeMatching, schemeMatches }`.
- `useFilteredCounts(processedPaints, paintGroups)` — reads all filter state, returns `{ filteredPaintCount, filteredColorCount, isAnyFilterActive }`.

These hooks use `useMemo` internally and subscribe to only the store slices they need.

### Step 7: Refactor page.tsx

Strip `page.tsx` down to a layout composition component:

1. Remove all `useState` calls (15+ lines)
2. Remove all `useCallback` handlers that are now store actions
3. Replace with store hooks:
   ```typescript
   const { selectedGroup, hoveredGroup, viewMode, paintToRemove } = usePaintStore()
   const { brandFilter, colorScheme, ownedFilter, searchQuery } = useFilterStore()
   const { showBrandRing, showOwnedRing, zoom, pan } = useUIStore()
   const { ownedIds } = useCollectionStore()
   ```
4. Use derived hooks:
   ```typescript
   const processedPaints = useProcessedPaints()
   const paintGroups = usePaintGroups(processedPaints)
   const { searchMatchIds } = useSearchResults(processedPaints)
   const { isSchemeMatching } = useSchemeMatching()
   ```
5. Remove prop passing — components read their own state
6. Keep the JSX structure (layout, sidebar, main area) but strip the props

### Step 8: Refactor ColorWheel to use stores

Update `src/components/ColorWheel.tsx`:

1. Remove the props interface (18 props)
2. Import and use stores directly:
   ```typescript
   const paintGroups = usePaintStore(s => s.paintGroups) // or from derived hook
   const selectedGroup = usePaintStore(s => s.selectedGroup)
   const { brandFilter, searchMatchIds } = useFilterStore()
   ```
3. Internal state (`isDragging`, `dragStart`, etc.) stays as local `useState`/`useRef` — these are component-specific
4. Replace `onGroupClick` prop with direct `usePaintStore.getState().selectGroup(group)` calls
5. Replace `onHoverGroup` with `usePaintStore.getState().setHoveredGroup(group)`
6. Replace `onZoomChange`/`onPanChange` with `useUIStore.getState().setZoom()`/`setPan()`

### Step 9: Refactor GridView to use stores

Update `src/components/GridView.tsx`:

1. Remove the props interface (13 props)
2. Import and use stores directly (same pattern as ColorWheel)
3. Keep the `useMemo` sort — it's component-specific derived data

### Step 10: Refactor DetailPanel to use stores

Update `src/components/DetailPanel.tsx`:

1. Remove props interface (10 props)
2. Read `selectedGroup`, `selectedPaint`, `hoveredGroup` from paint store
3. Read `colorScheme` from filter store
4. Read `ownedIds` from collection store
5. Read `schemeMatches`, `searchResults` from derived hooks
6. Replace `onSelectPaint`, `onBack`, `onToggleOwned` callbacks with direct store actions

### Step 11: Refactor CollectionPanel to use stores

Update `src/components/CollectionPanel.tsx`:

1. Remove props interface (8 props)
2. Read `ownedIds`, `toggleOwned` from collection store
3. Read `showOwnedRing`, `toggleOwnedRing` from UI store
4. Read `ownedFilter`, `toggleOwnedFilter` from filter store
5. Keep internal state (`collectionSearch`, `paintToRemove`) as local state — it's component-specific

### Step 12: Refactor BrandLegend to use stores

Update `src/components/BrandLegend.tsx`:

1. Remove `paintCounts` prop — compute or receive from derived hook
2. Read `brands` directly from data import

### Step 13: Delete useOwnedPaints hook

Remove `src/hooks/useOwnedPaints.ts` — fully replaced by `useCollectionStore`.

### Step 14: Update type exports

Add the `ViewMode` and `SidebarTab` types to `src/types/paint.ts`:

```typescript
export type ViewMode = 'wheel' | 'grid'
export type SidebarTab = 'filters' | 'collection'
```

### Affected Files

| File | Changes |
|------|---------|
| `src/stores/useCollectionStore.ts` | New — owned paints with localStorage persist |
| `src/stores/useFilterStore.ts` | New — brand filter, search, scheme, owned filter |
| `src/stores/usePaintStore.ts` | New — selection, hover, view mode |
| `src/stores/useUIStore.ts` | New — sidebar, display toggles, zoom/pan |
| `src/hooks/useDerivedPaints.ts` | New — processedPaints, paintGroups, brandPaintCounts |
| `src/hooks/useFilteredPaints.ts` | New — searchResults, schemeMatches, filteredCounts |
| `src/hooks/useOwnedPaints.ts` | Removed — replaced by useCollectionStore |
| `src/app/page.tsx` | Major refactor — remove state, use stores, strip props |
| `src/components/ColorWheel.tsx` | Remove props, read from stores |
| `src/components/GridView.tsx` | Remove props, read from stores |
| `src/components/DetailPanel.tsx` | Remove props, read from stores |
| `src/components/CollectionPanel.tsx` | Remove props, read from stores |
| `src/components/BrandLegend.tsx` | Remove props, read from stores |
| `src/types/paint.ts` | Add ViewMode and SidebarTab types |
| `package.json` | Add zustand dependency |

### Risks & Considerations

- **localStorage migration:** Existing users have owned paint data stored under `'colorwheel-owned-paints'` in the old format (plain JSON array). The new `useCollectionStore` must handle both the legacy format and the Zustand persist format to avoid data loss. Test this path explicitly.
- **Hydration mismatch:** Zustand persist middleware loads from localStorage asynchronously. Components that read `ownedIds` on first render will see an empty set before hydration completes. Use Zustand's `onRehydrateStorage` callback or a `hasHydrated` flag to avoid flash-of-incorrect-state.
- **Cross-store dependencies:** `selectGroup` in the paint store needs to reset `colorScheme` in the filter store. Use `getState()` for cross-store reads/writes rather than subscribing, to avoid circular dependencies.
- **No behavior changes:** This is a pure refactor. Every filter, interaction, and display behavior must work identically before and after. Manual testing against the current UI is essential.
- **Component re-renders:** Zustand selectors must be granular. Using `usePaintStore()` without a selector subscribes to all state changes. Always use `usePaintStore(s => s.selectedGroup)` pattern to minimize re-renders.
- **Future readiness:** The store pattern naturally accommodates the upcoming database integration (Epic 8/9). When Supabase is added, `useCollectionStore` can swap localStorage persistence for API calls with minimal changes to consumers.
