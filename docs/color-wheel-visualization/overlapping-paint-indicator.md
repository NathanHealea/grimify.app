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

## Implementation Plan

### Step 1 — Group paints by wheel position

**File:** `src/components/ColorWheel.tsx`

After computing `processedPaints`, group them by snapping their `(x, y)` coordinates to a grid with cell size equal to `DOT_RADIUS`. Paints that land in the same grid cell are considered overlapping.

```ts
interface PaintGroup {
  key: string
  x: number       // average x of all paints in the group
  y: number       // average y of all paints in the group
  paints: ProcessedPaint[]
}
```

Create a `useMemo` that builds a `PaintGroup[]` from `processedPaints`:

1. For each paint, compute a grid key: `Math.round(x / DOT_RADIUS),Math.round(y / DOT_RADIUS)`
2. Collect paints into a `Map<string, ProcessedPaint[]>` by grid key
3. For each group, compute the centroid `(avgX, avgY)` for rendering position
4. Return the array of `PaintGroup` objects

### Step 2 — Render grouped dots with count badges

**File:** `src/components/ColorWheel.tsx`

Replace the current per-paint `<circle>` rendering with per-group rendering. Each group renders **one** `<circle>` and **one** set of event handlers, eliminating the stacked-element flickering:

- **Single-paint group (count = 1):** Render the dot exactly as today — a `<circle>` filled with the paint's hex, dark stroke. Hover/click events target this single circle.
- **Multi-paint group (count > 1):** Render:
  1. A `<circle>` filled with the first paint's hex color (or a neutral color) as the base dot
  2. A small count badge: a `<circle>` + `<text>` positioned at the top-right of the dot showing the count number. Badge background should be a contrasting color (e.g., white circle with dark text) so it's visible at any zoom level.

The badge should scale inversely with zoom (or use a fixed SVG size) so it remains readable.

**Labels at zoom > 2x:** Render one `<text>` per group (not per paint). For multi-paint groups show the first paint name followed by `+N` (e.g., "Abaddon Black +2"). This fixes the garbled stacked labels.

**Hover events:** Attach `onPointerEnter`/`onPointerLeave` to the single group `<circle>`. For single-paint groups, set `hoveredPaint` directly. For multi-paint groups, set a `hoveredGroup` state so the sidebar can show a preview list. Since there is only one circle element per position, pointer events no longer flicker between stacked elements.

### Step 3 — Add group and paint selection state

**File:** `src/app/page.tsx`

Replace the existing `selectedPaint`/`hoveredPaint` state with group-aware equivalents:

```ts
const [selectedGroup, setSelectedGroup] = useState<PaintGroup | null>(null)
const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null)
const [hoveredGroup, setHoveredGroup] = useState<PaintGroup | null>(null)
const [hoveredPaint, setHoveredPaint] = useState<ProcessedPaint | null>(null)
```

**Selection flow:**
- Click a **multi-paint group** → set `selectedGroup`, clear `selectedPaint` → sidebar shows paint list
- Click a **single-paint group** → set both `selectedGroup` and `selectedPaint` → sidebar shows details directly
- Select a paint from the sidebar list → set `selectedPaint` → sidebar shows that paint's details
- Click the same group again or click empty space → deselect

**Hover flow:**
- Hover a **single-paint group** → set `hoveredPaint` directly (same as today, no flicker)
- Hover a **multi-paint group** → set `hoveredGroup` → sidebar previews the group's paint list
- Leave hover → clear both `hoveredGroup` and `hoveredPaint`

Pass `onGroupClick`, `onGroupHover`, `selectedGroup`, `hoveredGroup` down to `ColorWheel`. Pass `selectedGroup`, `selectedPaint`, `hoveredGroup`, `hoveredPaint`, `onSelectPaint` down to `Sidebar`.

The `PaintGroup` type defined in Step 1 should be moved to `src/types/paint.ts` so both components can reference it. `ProcessedPaint` is already there.

### Step 4 — Add click handlers to ColorWheel

**File:** `src/components/ColorWheel.tsx`

Add `onClick` handlers to each group's rendered `<circle>`:

```tsx
onClick={(e) => {
  e.stopPropagation()
  onGroupClick(group)
}}
```

**Click vs drag disambiguation:** Only fire the click if the mouse hasn't moved more than 3px between `mousedown` and `mouseup`. Track the start position in `mousedown` and compare in the click handler. If `isDragging` was true or distance exceeds threshold, skip the click.

Add a click handler on the SVG background to deselect:

```tsx
<rect ... fill="transparent" onClick={() => onGroupClick(null)} />
```

Highlight the selected group's dot with a white dashed ring (a second `<circle>` with `stroke="white"`, `strokeDasharray="4 2"`, `fill="none"`, larger radius).

### Step 5 — Display paint list and details in Sidebar

**File:** `src/components/Sidebar.tsx`

Update the **Color Details** section in the sidebar:

**When a group is selected but no individual paint:**
Show a scrollable list of paints in the group. Each item shows:
- Color swatch (small square filled with the paint's hex)
- Paint name
- Brand name
- Clickable — clicking sets `selectedPaint`

**When an individual paint is selected:**
Show full details:
- Name and brand
- Hex value with color swatch
- HSL values
- Paint type (Base, Layer, Shade, etc.)
- A "Back to group" link/button if the group has multiple paints

**When nothing is selected:**
Show the current placeholder text: "Select a paint to see details"

### Step 6 — Compute paint groups in page.tsx

**File:** `src/app/page.tsx`

`processedPaints` is already computed in `page.tsx`. Add a second `useMemo` that computes `paintGroups` from `processedPaints` using the grouping logic from Step 1. Pass `paintGroups` down to `ColorWheel` (instead of or alongside `processedPaints`) so the grouping is centralized and available to both components.

### Risks & Considerations

- **Grid cell size:** Using `DOT_RADIUS` as the grid cell size means paints within ~5 SVG units of each other get grouped. This may be too aggressive or too conservative — tune based on visual results. Consider using `DOT_RADIUS * 2` (full diameter) instead.
- **Performance:** Grouping 190+ paints is cheap. The main cost is the badge rendering — keep badge SVG simple (circle + text).
- **Zoom interaction with badges:** Count badges should remain legible at all zoom levels. Consider scaling the badge inversely with zoom or clamping its size.
- **Builds on paint-selection-and-hover:** The selection and hover infrastructure from `paint-selection-and-hover` is already merged. This work replaces the per-paint hover/selection with group-aware equivalents. Ensure backward compatibility — single-paint groups should behave identically to the current per-paint behavior.
