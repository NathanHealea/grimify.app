# Owned Paint Collection

**Epic:** Paint Collection
**Type:** Feature
**Status:** In Progress

## Summary

Allow users to mark paints they own in their personal collection. Owned paints are persisted in the browser's localStorage and visualized with a colored ring indicator around paint dots on the color wheel. Users can toggle the owned ring visibility, filter the wheel to show only owned paints, and mark/unmark paints as owned from the detail panel.

## Acceptance Criteria

- [x] Users can mark a paint as owned from the detail panel when a paint is selected
- [x] Users can unmark a paint as owned from the detail panel
- [x] Owned paint IDs are persisted in browser localStorage
- [x] Owned paints display a ring indicator around their color dot on the wheel
- [x] Users can toggle the owned ring indicator on/off from the sidebar
- [x] Users can filter the wheel to show only owned paints
- [x] Visibility priority cascade: owned/search > Color Scheme > Brand Filters

## Implementation Plan

### Step 1: Create `useOwnedPaints` hook

**File:** `src/hooks/useOwnedPaints.ts` (new)

Create a custom React hook that manages a `Set<string>` of owned paint IDs backed by localStorage.

```ts
const STORAGE_KEY = 'colorwheel-owned-paints'

export function useOwnedPaints() {
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  })

  const toggleOwned = useCallback((paintId: string) => {
    setOwnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(paintId)) next.delete(paintId)
      else next.add(paintId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  return { ownedIds, toggleOwned }
}
```

**Notes:**
- Lazy initializer reads from localStorage on mount only
- Must handle SSR by guarding `localStorage` access (wrap in `typeof window !== 'undefined'` check or use `useEffect` for hydration)
- Paint IDs are already stable: `${paint.brand}-${paint.name}-${paint.type}` (computed in `page.tsx` line 40)

### Step 2: Wire owned state into `page.tsx`

**File:** `src/app/page.tsx`

- Import and call `useOwnedPaints()` to get `ownedIds` and `toggleOwned`
- Add `showOwnedRing` state: `const [showOwnedRing, setShowOwnedRing] = useState(false)`
- Add `ownedFilter` state: `const [ownedFilter, setOwnedFilter] = useState(false)`
- Pass `ownedIds`, `toggleOwned`, `showOwnedRing`, and `ownedFilter` down to child components

### Step 3: Add "Mark as Owned" button in DetailPanel

**File:** `src/components/DetailPanel.tsx`

Add new props to `DetailPanelProps`:

```ts
ownedIds: Set<string>
onToggleOwned: (paintId: string) => void
```

In the single-paint detail view (the `if (paint)` branch, ~line 155), add a toggle button below the paint name/brand header:

```tsx
<button
  className={`btn btn-sm w-full ${ownedIds.has(paint.id) ? '' : 'btn-outline'}`}
  style={
    ownedIds.has(paint.id)
      ? { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
      : { borderColor: '#10b981', color: '#10b981' }
  }
  onClick={() => onToggleOwned(paint.id)}
>
  {ownedIds.has(paint.id) ? '✓ Owned' : 'Mark as Owned'}
</button>
```

Place this after the HSL sliders and before the matches list. The button follows the existing DaisyUI button styling pattern used by brand filter buttons.

### Step 4: Add owned ring indicator in ColorWheel

**File:** `src/components/ColorWheel.tsx`

Add new props to `ColorWheelProps`:

```ts
ownedIds: Set<string>
showOwnedRing: boolean
```

Pass these through to `PaintDot` as props.

In `PaintDot`, when `showOwnedRing` is true and any paint in the group is owned, render a ring indicator. The owned ring should render as a solid colored circle (stroke-only) around the paint dot, similar to the search highlight but with a distinct color (green `#10b981`):

```tsx
{showOwnedRing && isOwned && !dimmed && (
  <circle
    cx={rep.x}
    cy={rep.y}
    r={r + (showBrandRing ? 5.5 : 3)}
    fill='none'
    stroke='#10b981'
    strokeWidth={1.5}
    pointerEvents='none'
  />
)}
```

**Render order in PaintDot (inside → outside):**
1. Owned ring (outermost, behind everything interactive)
2. Search highlight (yellow glow)
3. Selection ring (white dashed)
4. Brand ring arcs
5. Paint circle (main dot)
6. Duplicate badge

The owned ring radius adjusts based on whether the brand ring is also shown, so they don't overlap.

**Owned check:** `const isOwned = group.paints.some((p) => ownedIds.has(p.id))`

### Step 5: Add "Owned Ring" toggle to sidebar

**File:** `src/app/page.tsx`

Add an "Owned Ring" toggle button in the sidebar, placed next to the existing "Brand Ring" toggle. Follow the same button pattern:

```tsx
<section>
  <div className="flex gap-1">
    <button
      className={`btn btn-sm flex-1 ${showBrandRing ? '' : 'btn-outline'}`}
      style={...}
      onClick={() => setShowBrandRing(!showBrandRing)}>
      Brand Ring
    </button>
    <button
      className={`btn btn-sm flex-1 ${showOwnedRing ? '' : 'btn-outline'}`}
      style={
        showOwnedRing
          ? { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
          : { borderColor: '#10b981', color: '#10b981' }
      }
      onClick={() => setShowOwnedRing(!showOwnedRing)}>
      Owned Ring
    </button>
  </div>
</section>
```

### Step 6: Add "Owned" filter to sidebar

**File:** `src/app/page.tsx`

Add an "Owned" filter toggle button in the sidebar. Place it as a new section between the ring toggles and the brand legend, or alongside the brand filter section:

```tsx
<section>
  <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Collection Filter</h3>
  <button
    className={`btn btn-sm w-full justify-start ${ownedFilter ? '' : 'btn-outline'}`}
    style={
      ownedFilter
        ? { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
        : { borderColor: '#10b981', color: '#10b981' }
    }
    onClick={() => setOwnedFilter(!ownedFilter)}>
    Owned Only ({ownedIds.size})
  </button>
</section>
```

When `ownedFilter` is true, clear selection (same pattern as brand filter change).

### Step 7: Update visibility priority cascade

**File:** `src/components/ColorWheel.tsx`

Update the dimming logic in the paint groups rendering loop (~line 551) to include owned filter at the same priority level as search:

```ts
const matchesBrand = brandFilter.size === 0 || group.paints.some((p) => brandFilter.has(p.brand))
const matchesSearch = searchMatchIds.size === 0 || group.paints.some((p) => searchMatchIds.has(p.id))
const matchesOwned = !ownedFilter || group.paints.some((p) => ownedIds.has(p.id))
const hasActiveScheme = colorScheme !== 'none' && selectedPaint !== null
const schemeDimmed = !group.paints.some(isSchemeMatching)

// Priority: owned/search > scheme > brand
const dimmed = !matchesBrand || !matchesOwned || (hasActiveScheme ? schemeDimmed : !matchesSearch)
```

**Priority cascade (highest → lowest):**
1. **Owned filter + Search** — always apply when active (AND logic with each other and everything below)
2. **Color scheme** — overrides search highlighting when active
3. **Brand filter** — base constraint, always applies

Add `ownedIds: Set<string>` and `ownedFilter: boolean` to `ColorWheelProps`.

### Step 8: Update stats overlay

**File:** `src/app/page.tsx`

Update `filteredPaintCount` and `filteredColorCount` memos to account for the owned filter:

```ts
const matchesOwned = !ownedFilter || ownedIds.has(p.id)
return matchesBrand && matchesSearch && matchesScheme && matchesOwned
```

Update `isAnyFilterActive` to include owned filter:

```ts
const isAnyFilterActive = isFiltered || isSearching || isSchemeActive || ownedFilter
```

### Affected Files

| File | Changes |
|------|---------|
| `src/hooks/useOwnedPaints.ts` | New file — localStorage-backed hook for owned paint IDs |
| `src/app/page.tsx` | Add owned state, ring toggle, filter toggle, pass props, update stats |
| `src/components/DetailPanel.tsx` | Add "Mark as Owned" toggle button |
| `src/components/ColorWheel.tsx` | Add owned ring indicator, update dimming logic for owned filter |

### Risks & Considerations

- **SSR hydration mismatch:** localStorage is not available during SSR. The `useOwnedPaints` hook must handle this — either initialize with an empty set and populate via `useEffect`, or guard with `typeof window !== 'undefined'`. Since the app is `"use client"`, this is less risky but still needs care.
- **Paint ID stability:** Owned IDs are keyed on `${brand}-${name}-${type}`. If paint data changes (renames, new entries), orphaned IDs in localStorage are harmless but won't match. No migration needed.
- **localStorage size:** 190+ paint IDs as a JSON array is well under localStorage limits (~5MB). No concern here.
- **Owned ring + brand ring stacking:** When both rings are visible, the owned ring renders outside the brand ring. The radius calculation adjusts dynamically based on `showBrandRing` to prevent overlap.
- **Search highlight + owned ring:** Both can render simultaneously. The search highlight (yellow glow) renders inside the owned ring (green stroke). They use different visual styles (glow vs solid stroke) so they remain distinguishable.
- **Performance:** One additional `Set.has()` check per paint per group is O(1) and negligible. No memoization concerns.
