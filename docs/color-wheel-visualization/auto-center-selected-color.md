# Auto-Center Selected Color

**Epic:** Color Wheel Visualization
**Type:** Feature
**Status:** Todo

## Summary

Add a toggle button that, when enabled, automatically pans (and optionally zooms) the color wheel to center on the currently selected paint. This helps users keep focus on their selection, especially when zoomed in or when exploring scheme matches across the wheel.

## Acceptance Criteria

- [ ] A toggle button in the sidebar (or next to the Reset View button) enables/disables auto-centering
- [ ] When enabled and a paint is selected, the wheel pans to center the selected paint in the viewport
- [ ] When enabled and a new paint is selected, the wheel re-centers on the new selection
- [ ] When the toggle is disabled, zoom/pan behavior returns to manual control (no snap)
- [ ] Deselecting a paint (clicking empty space) does not change the view
- [ ] The toggle state is visually clear (active vs inactive)

## Current State

### Zoom/Pan Mechanics

State lives in `src/app/page.tsx`:

```tsx
const [zoom, setZoom] = useState(1)         // range: 0.4–8
const [pan, setPan] = useState({ x: 0, y: 0 }) // SVG coordinate units
```

The `ColorWheel.tsx` viewBox uses these values:

```tsx
const viewSize = totalSize / zoom
const viewBox = `${-viewSize / 2 + pan.x} ${-viewSize / 2 + pan.y} ${viewSize} ${viewSize}`
```

Setting `pan = { x: paintX, y: paintY }` centers that SVG point in the viewport.

### Paint Coordinates

Each `ProcessedPaint` has `x` and `y` properties computed from its hue and lightness via `paintToWheelPosition()`:

```tsx
x = WHEEL_RADIUS * (1 - lightness) * cos(hue°)
y = -WHEEL_RADIUS * (1 - lightness) * sin(hue°)
```

Coordinates are in SVG units centered on `(0, 0)`.

### Selection State

```tsx
const [selectedGroup, setSelectedGroup] = useState<PaintGroup | null>(null)
const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null)
```

`selectedPaint` has the `x, y` coordinates needed for centering.

## Implementation Plan

### Step 1 — Add auto-center state

**File:** `src/app/page.tsx`

Add a boolean state for the toggle:

```tsx
const [autoCenter, setAutoCenter] = useState(false)
```

### Step 2 — Add centering effect

**File:** `src/app/page.tsx`

Add a `useEffect` that runs when `selectedPaint` changes (and auto-center is on):

```tsx
useEffect(() => {
  if (!autoCenter || !selectedPaint) return
  setPan({ x: selectedPaint.x, y: selectedPaint.y })
}, [autoCenter, selectedPaint])
```

This sets the pan to the paint's SVG coordinates, which centers it in the viewport. No zoom change — keep the user's current zoom level.

### Step 3 — Add toggle button to the main area

**File:** `src/app/page.tsx`

Add an auto-center toggle button near the existing "Reset View" button in the `<main>` section:

```tsx
<button
  onClick={() => setAutoCenter(!autoCenter)}
  className={`btn btn-ghost btn-sm absolute right-4 bottom-12 bg-base-300/50 backdrop-blur-sm ${autoCenter ? 'btn-active' : ''}`}>
  Auto Center
</button>
```

Position it above the Reset View button (`bottom-12` vs `bottom-4`).

### Step 4 — Center immediately when toggling on

Update the toggle handler to immediately center if a paint is already selected:

```tsx
const handleToggleAutoCenter = useCallback(() => {
  setAutoCenter((prev) => {
    const next = !prev
    if (next && selectedPaint) {
      setPan({ x: selectedPaint.x, y: selectedPaint.y })
    }
    return next
  })
}, [selectedPaint])
```

Use this handler instead of the inline `onClick`.

### Files Changed

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Add `autoCenter` state, centering effect, toggle button |

## Risks & Considerations

- **No animation:** The initial implementation snaps instantly. A smooth transition could be added later using `requestAnimationFrame` but adds complexity.
- **Zoom level:** Auto-center only pans, it does not change zoom. If the user is zoomed out to 1x, the centering effect is subtle. Could optionally zoom to 2x when auto-centering, but keeping zoom unchanged is simpler and less surprising.
- **Manual pan override:** When auto-center is on and the user manually pans, the next selection will snap back. This is expected behavior — the toggle means "center on selection." If this feels disruptive, a future enhancement could disable auto-center when the user manually pans.
- **Group selection without paint:** When clicking a multi-paint group, `selectedPaint` is null until a specific paint is chosen. Auto-center only triggers when `selectedPaint` is set, so group-only selection won't cause a pan.
