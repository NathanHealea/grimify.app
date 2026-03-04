# Overlapping Paint Indicator

**Epic:** Color Wheel Visualization
**Type:** Bug
**Status:** Todo

## Summary

When two or more paints share the same (or very similar) hue and lightness, they render at the same position on the color wheel and visually overlap. There are three problems:

1. **No overlap indication** — there is no visual cue that multiple paints exist at a position. Users should see a count badge.
2. **Garbled labels** — at zoom > 2x, overlapping paints each render their own `<text>` label at the same x,y, producing unreadable stacked text.
3. **Hover flickering** — overlapping `<circle>` elements at the same position cause rapid `onPointerEnter`/`onPointerLeave` events as the browser switches hit targets between stacked circles. This makes the glow effect and sidebar details flicker erratically.

## Acceptance Criteria

- [ ] Paints at the same wheel position are grouped into a single indicator
- [ ] Grouped indicators display a count badge showing the number of paints
- [ ] Clicking a grouped indicator shows a list of all paints in that group in the sidebar
- [ ] Selecting a paint from the group list shows its full color details
- [ ] Single-paint indicators (no overlap) behave as normal dots with no badge
- [ ] At zoom > 2x, grouped paints show a single label (e.g., "Abaddon Black +2") instead of stacked overlapping labels
- [ ] Hovering over overlapping paints does not flicker — the hover glow and sidebar preview are stable

## Reference

The sibling project `miniature-colors.nathanhealea.com` has a working implementation of paint grouping. Key patterns to adapt (not copy verbatim — that project uses inline styles and single-letter property names):

- Groups paints by **hex color** into `PaintGroup = { hex, paints[], rep }` where `rep` is the representative paint used for position
- Passes `groups` (not individual paints) to `ColorWheel` — one `<circle>` per group eliminates flicker
- Count badge: gold `<circle>` + `<text>` at top-right offset (`cx + r*0.7, cy - r*0.7`) with `pointerEvents: 'none'`
- Labels: `cnt > 1 ? "${cnt} paints" : paintName` — one label per group
- DetailPanel shows "Same hex across brands" list with clickable rows when `dupes.length > 1`
- Hover/select targets the `rep` paint, not individual overlapping paints

## Implementation Plan

### Step 1 — Add `PaintGroup` type and compute groups in page.tsx

**File:** `src/types/paint.ts`, `src/app/page.tsx`

Add a shared `PaintGroup` type:

```ts
export interface PaintGroup {
  key: string
  paints: ProcessedPaint[]
  rep: ProcessedPaint // representative paint (first in group), used for position
}
```

In `page.tsx`, add a `useMemo` after `processedPaints` that groups by hex color (paints with the same hex always map to the same wheel position):

```ts
const paintGroups = useMemo<PaintGroup[]>(() => {
  const map = new Map<string, ProcessedPaint[]>()
  processedPaints.forEach((p) => {
    const key = p.hex.toLowerCase()
    const list = map.get(key) ?? []
    list.push(p)
    map.set(key, list)
  })
  return Array.from(map.entries()).map(([key, paints]) => ({
    key,
    paints,
    rep: paints[0],
  }))
}, [processedPaints])
```

Pass `paintGroups` to `ColorWheel` instead of `processedPaints`.

### Step 2 — Update ColorWheel to render per-group

**File:** `src/components/ColorWheel.tsx`

Change `ColorWheelProps` to accept `paintGroups: PaintGroup[]` instead of `processedPaints: ProcessedPaint[]`. Replace the per-paint `<circle>` loop with a per-group loop. Each group renders a single `<g>` containing:

1. **Selection ring** (if selected): dashed white circle at `rep` position, `r = DOT_RADIUS + 4` — already exists, just match by group key instead of paint id
2. **Base dot**: one `<circle>` at `rep.x, rep.y` filled with `rep.hex`. Multi-paint groups get a slightly larger radius (`DOT_RADIUS + 2`)
3. **Count badge** (if `count > 1`): a small circle + text positioned at top-right of the dot. Use `pointerEvents: 'none'` so it doesn't interfere with hover/click on the base dot

```tsx
{group.paints.length > 1 && (
  <>
    <circle
      cx={rep.x + DOT_RADIUS * 0.7}
      cy={rep.y - DOT_RADIUS * 0.7}
      r={4}
      fill="#f0c040"
      stroke="#000"
      strokeWidth={0.5}
      pointerEvents="none"
    />
    <text
      x={rep.x + DOT_RADIUS * 0.7}
      y={rep.y - DOT_RADIUS * 0.7 + 0.5}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#000"
      fontSize={5}
      fontWeight={800}
      pointerEvents="none"
    >
      {group.paints.length}
    </text>
  </>
)}
```

**Hover events:** Attach `onPointerEnter`/`onPointerLeave` to the single group `<circle>`. For single-paint groups, call `onHoverPaint(rep)`. For multi-paint groups, call `onHoverGroup(group)`. One circle per position eliminates the flicker.

**Labels at zoom > 2x:** Render one `<text>` per group. For multi-paint groups: `"${count} paints"`. For single-paint groups: the paint name. This fixes the garbled stacked labels.

### Step 3 — Update selection and hover state

**File:** `src/app/page.tsx`

Replace `selectedPaint`/`hoveredPaint` with group-aware state:

```ts
const [selectedGroup, setSelectedGroup] = useState<PaintGroup | null>(null)
const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null)
const [hoveredGroup, setHoveredGroup] = useState<PaintGroup | null>(null)
```

**Click handler** (passed to `ColorWheel` as `onGroupClick`):

```ts
const handleGroupClick = useCallback((group: PaintGroup | null) => {
  if (!group) {
    setSelectedGroup(null)
    setSelectedPaint(null)
    return
  }
  if (selectedGroup?.key === group.key) {
    setSelectedGroup(null)
    setSelectedPaint(null)
  } else if (group.paints.length === 1) {
    setSelectedGroup(group)
    setSelectedPaint(group.rep)
  } else {
    setSelectedGroup(group)
    setSelectedPaint(null) // show list first
  }
}, [selectedGroup])
```

**Hover handler** (passed to `ColorWheel` as `onHoverGroup`):
- Set `hoveredGroup` on enter, clear on leave
- Sidebar reads `hoveredGroup` to preview — for single-paint groups show paint details, for multi-paint groups show the group's paint list

Keep `dragDistance` check in `ColorWheel` — skip click if `dragDistance.current > 3`.

### Step 4 — Update Color Details in sidebar

**File:** `src/app/page.tsx` (the `PaintDetails` component)

Replace the current `PaintDetails` component with group-aware rendering. Display priority: `hoveredGroup` > `selectedGroup` > placeholder.

**When showing a multi-paint group (no individual paint selected):**
Show the group's hex swatch and a scrollable list of paints. Each list item shows:
- Color swatch (small square)
- Paint name
- Brand icon + name
- Clickable — clicking calls `setSelectedPaint(paint)` and `setSelectedGroup(group)`

**When showing a single paint (selected from list or single-paint group):**
Show full details (same as current `PaintDetails` output). If the group has multiple paints, show a "Same color ({count})" header above the details with a back button to return to the group list.

**When nothing is hovered or selected:**
Show the current placeholder: "Select a paint to see details"

### Step 5 — Visual feedback refinements

**File:** `src/components/ColorWheel.tsx`

- **Selected group ring:** Keep the existing dashed white ring, but match by `selectedGroup?.key` instead of `selectedPaint?.id`. Position at `selectedGroup.rep.x/y`.
- **Hovered group glow:** Keep the existing glow filter, but apply to `hoveredGroup?.rep` position. For multi-paint groups, use a slightly larger radius to indicate it's a group.
- Multi-paint groups should render at a slightly larger base radius (`DOT_RADIUS + 2`) so users can visually distinguish them even without seeing the badge.

### Risks & Considerations

- **Grouping by hex:** This groups paints with the exact same hex color. Paints with very similar but not identical hex values will still render as separate dots that may visually overlap. This matches the sibling project's approach and is the simplest correct solution — near-miss overlaps are a future enhancement.
- **Performance:** Grouping 190+ paints is trivial. One circle per group reduces total SVG elements, actually improving render performance.
- **Builds on paint-selection-and-hover:** The selection/hover infrastructure is already merged. This refactors it from per-paint to per-group. Single-paint groups should behave identically to the current per-paint behavior.
