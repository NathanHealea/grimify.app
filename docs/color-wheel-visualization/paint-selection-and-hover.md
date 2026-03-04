# Paint Selection & Hover

**Epic:** Color Wheel Visualization
**Type:** Feature
**Status:** Completed

## Summary

Allow users to interact with individual paint circles on the color wheel through hover and click actions. Hovering previews paint details; clicking selects a paint for persistent inspection.

## Acceptance Criteria

- [x] Hover over a paint circle to preview its details in the side panel
- [x] Click a paint to select it (persists until clicked again or another paint is selected)
- [x] Selected paints show a dashed white ring
- [x] Hovered paints glow

## Implementation Plan

### Step 1 — Promote `ProcessedPaint` to shared type

**File:** `src/types/paint.ts`

Move the `ProcessedPaint` interface (currently local to `ColorWheel.tsx`) into the shared types file so both `ColorWheel` and `Sidebar` can reference it. Add an `id` field (`${brand}-${name}`) for stable identification instead of relying on array index.

```ts
export interface ProcessedPaint extends Paint {
  id: string
  x: number
  y: number
}
```

Update `ColorWheel.tsx` to import from `@/types/paint` and generate the `id` during processing.

### Step 2 — Add hover and selection state to `page.tsx`

**File:** `src/app/page.tsx`

Add two new state variables:

```ts
const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null)
const [hoveredPaint, setHoveredPaint] = useState<ProcessedPaint | null>(null)
```

Lift `processedPaints` computation from `ColorWheel` into `page.tsx` so the processed list is available to both `ColorWheel` (for rendering) and `Sidebar` (for detail display). Pass down:

- `processedPaints` → `ColorWheel`
- `selectedPaint`, `hoveredPaint`, `onSelectPaint`, `onHoverPaint` → `ColorWheel`
- `selectedPaint`, `hoveredPaint` → `Sidebar`

### Step 3 — Add per-circle event handlers in `ColorWheel`

**File:** `src/components/ColorWheel.tsx`

Add `onMouseEnter`, `onMouseLeave`, and `onClick` handlers to each `<circle>` element:

```tsx
<circle
  key={paint.id}
  cx={paint.x}
  cy={paint.y}
  r={DOT_RADIUS}
  fill={paint.hex}
  stroke={...}
  strokeWidth={...}
  className="cursor-pointer"
  onMouseEnter={() => onHoverPaint(paint)}
  onMouseLeave={() => onHoverPaint(null)}
  onClick={(e) => {
    e.stopPropagation()
    onSelectPaint(paint.id === selectedPaint?.id ? null : paint)
  }}
/>
```

**Click vs drag disambiguation:** Track mouse movement distance between `mousedown` and `mouseup`. Only treat as a click if the mouse moved less than ~3px. This prevents pan drags from triggering selection. Use the existing `isDragging` state — skip the click handler if `isDragging` is true.

### Step 4 — Visual feedback for hover and selection

**File:** `src/components/ColorWheel.tsx`

**Hovered paint glow:** Add an SVG `<filter>` definition to the `<defs>` section for a glow effect:

```svg
<filter id="paint-glow">
  <feGaussianBlur stdDeviation="3" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

Apply `filter="url(#paint-glow)"` to the hovered circle. Also slightly increase the radius (e.g., `DOT_RADIUS * 1.4`) on hover.

**Selected paint dashed ring:** Render a second `<circle>` behind the selected paint's dot with:
- Larger radius (`DOT_RADIUS + 4`)
- `stroke="white"`, `strokeWidth={2}`, `strokeDasharray="4 2"`
- `fill="none"`

Both the glow and the ring should render in a separate `<g>` layer above the regular dots so they aren't occluded.

### Step 5 — Display paint details in Sidebar

**File:** `src/components/Sidebar.tsx`

Replace the static "Select a paint to see details" placeholder in the **Color Details** section with dynamic content. Show the `hoveredPaint` if one exists, otherwise show the `selectedPaint`. Display:

- **Name** and **brand** (with brand icon)
- **Hex** value (with color swatch)
- **HSL** values (computed via `hexToHsl`)
- **Type** (e.g., Base, Layer, Shade)

If neither paint is set, show the current placeholder text.

### Step 6 — Touch support

**File:** `src/components/ColorWheel.tsx`

Add `onTouchEnd` handlers to circles (mapped to the click handler) so mobile users can tap to select. Use `onPointerEnter`/`onPointerLeave` instead of mouse-specific events for broader device support.

### Risks & Considerations

- **Performance:** 190+ circles each with event handlers. Should be fine — React handles this efficiently with event delegation. If performance becomes an issue, consider a single SVG-level hit-test approach instead.
- **Click vs pan:** The disambiguation threshold must feel natural. Test with real interactions and tune the distance threshold.
- **Z-ordering:** Hovered/selected circles and their decorations (ring, glow) must render on top. Use a separate `<g>` layer or re-order elements.
- **Accessibility:** Consider adding `role="button"`, `tabIndex`, and keyboard handlers (`Enter`/`Space` to select) to circles in a follow-up.
