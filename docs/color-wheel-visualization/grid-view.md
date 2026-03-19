# Grid View

**Epic:** Color Wheel Visualization
**Type:** Feature
**Status:** Completed

## Summary

An alternative grid-based visualization that displays all paints as color swatches in a sorted grid, ordered from darkest (black #000000) to lightest (white #FFFFFF). When multiple paints share the same hex value, HSL components (hue, then saturation) are used as tiebreakers for precise ordering. Toggle buttons in the main UI allow switching between the color wheel and grid views. All existing functionality — brand filtering, search, color schemes, collection tracking, and paint selection — carries over to the grid view.

## Acceptance Criteria

- [x] Grid view displays all paints as color swatches in a responsive grid layout
- [x] Paints are sorted from darkest to lightest using perceived luminance
- [x] Paints with identical hex values are sub-sorted by HSL (hue, then saturation) for deterministic ordering
- [x] Toggle buttons allow switching between "Wheel" and "Grid" view modes
- [x] Toggle buttons are visible and accessible on both desktop and mobile
- [x] Clicking a paint swatch in the grid selects it (opens DetailPanel, same as wheel)
- [x] Brand filtering, search highlighting, color scheme matching, and owned indicators apply in grid view
- [x] Filtered/dimmed paints appear with reduced opacity (consistent with wheel behavior)
- [x] Each swatch shows the paint's hex color and displays the paint name on hover or at sufficient size
- [x] Multi-paint groups (same hex) show a count badge and expand on click (same as wheel behavior)
- [x] Selected paint has a visible highlight/border in the grid
- [x] Grid view is responsive — adjusts column count based on viewport width
- [x] View mode persists during the session (not reset by filter changes)

## Design Notes

- **Sort order**: Primary sort by perceived luminance using the formula `0.299*R + 0.587*G + 0.114*B` (standard luminance weighting). This produces a more natural dark-to-light ordering than raw lightness. For identical hex values, sub-sort by hue (ascending) then saturation (ascending).
- **Swatch size**: Each swatch should be large enough to see the color clearly — roughly 48-64px squares on desktop, scaling down on mobile. The grid should use CSS grid with `auto-fill` and `minmax()` for responsive columns.
- **Swatch content**: Show hex color fill. On hover (or always at larger sizes), overlay paint name in contrasting text. For multi-paint groups, show a small count badge in the corner.
- **Toggle placement**: View mode toggle buttons ("Wheel" / "Grid") should sit in the top navbar area alongside the search input, or as a small button group in the main content area's top-right corner. Use DaisyUI `btn-group` or `join` for the toggle.
- **Dimming**: Filtered-out paints use the same opacity levels as the wheel (0.15 for brand/search filter, 0.06 for scheme dimming).
- **Mobile**: Grid naturally adapts to narrow viewports. The sidebar overlay behavior remains the same.

## File Structure

```
src/
  components/
    GridView.tsx              # New — grid visualization component
  app/
    page.tsx                  # Modified — add viewMode state, toggle UI, conditional rendering
  utils/
    colorUtils.ts             # Modified — add luminance sort utility
```

## Implementation Plan

### Step 1: Add luminance sort utility

Add to `src/utils/colorUtils.ts`:

- `hexToLuminance(hex: string): number` — converts hex to perceived luminance using `0.299*R + 0.587*G + 0.114*B` (values 0–255 scale, result 0–255). This is used for sort ordering, not display.
- `comparePaintGroups(a: PaintGroup, b: PaintGroup): number` — comparator function that:
  1. Compares by luminance (ascending — dark first)
  2. If equal luminance (same hex), compares by hue (ascending)
  3. If equal hue, compares by saturation (ascending)

### Step 2: Create GridView component

Create `src/components/GridView.tsx` as a `'use client'` component.

**Props** (mirror relevant ColorWheel props):
- `paintGroups: PaintGroup[]` — paint groups to render
- `selectedGroup: PaintGroup | null`
- `hoveredGroup: PaintGroup | null`
- `onGroupClick: (group: PaintGroup) => void`
- `onHoverGroup: (group: PaintGroup | null) => void`
- `brandFilter: Set<string>`
- `searchMatchIds: Set<string>`
- `colorScheme: string`
- `isSchemeMatching: (paint: ProcessedPaint) => boolean`
- `showBrandRing: boolean`
- `showOwnedRing: boolean`
- `ownedIds: Set<string>`
- `ownedFilter: boolean`

**Rendering**:
- Sort `paintGroups` using the `comparePaintGroups` comparator via `useMemo`
- Render as a CSS grid container with `grid-template-columns: repeat(auto-fill, minmax(3rem, 1fr))` and `gap: 2px`
- Each cell is a `<button>` element (accessible click target) with:
  - Background color set to the group's representative hex
  - `aspect-ratio: 1` for square swatches
  - Opacity reduced if the group is filtered out (same logic as ColorWheel dimming)
  - Ring/border for selected state (`ring-2 ring-white`)
  - Scale-up on hover (`hover:scale-110 transition-transform`)
  - Count badge (absolute-positioned small circle) if `group.paints.length > 1`
- Tooltip on hover showing paint name(s) and brand(s) — use `title` attribute or a lightweight tooltip
- Scroll container with `overflow-y: auto` filling the available main area

**Interaction handlers**:
- `onClick` → call `onGroupClick(group)` (same selection logic as wheel)
- `onMouseEnter` → call `onHoverGroup(group)`
- `onMouseLeave` → call `onHoverGroup(null)`

### Step 3: Add view mode state to page.tsx

In `src/app/page.tsx`:

- Add state: `const [viewMode, setViewMode] = useState<'wheel' | 'grid'>('wheel')`
- Add `ViewMode` type to `src/types/paint.ts` if desired
- Conditionally render `<ColorWheel>` or `<GridView>` based on `viewMode`
- Pass the same filter/selection props to `<GridView>` that `<ColorWheel>` receives
- The `zoom`, `pan`, and `resetView` state/handlers only apply when `viewMode === 'wheel'` — no need to hide them, but the reset button should only show in wheel mode

### Step 4: Add view mode toggle buttons

In `src/app/page.tsx`, add toggle buttons in the main content area (above the visualization, top-right corner):

- Use DaisyUI `join` component for a button group:
  ```tsx
  <div className="join">
    <button className={`join-item btn btn-sm ${viewMode === 'wheel' ? 'btn-active' : ''}`} onClick={() => setViewMode('wheel')}>
      Wheel
    </button>
    <button className={`join-item btn btn-sm ${viewMode === 'wheel' ? '' : 'btn-active'}`} onClick={() => setViewMode('grid')}>
      Grid
    </button>
  </div>
  ```
- Position with absolute positioning in the top-right of the main content area (similar to how the reset button is positioned in the bottom-right)
- Use Heroicons for optional icons: a circle/wheel icon and a grid icon alongside the text labels

### Step 5: Wire up filtering and dimming in GridView

Apply the same filtering cascade as ColorWheel. For each paint group, compute visibility:

1. Check `brandFilter` — if active and no paint in group matches, dim
2. Check `searchMatchIds` — if search is active and no paint matches, dim
3. Check `isSchemeMatching` — if scheme is active and no paint matches, scheme-dim (lower opacity)
4. Check `ownedFilter` — if active and no paint is owned, dim

Use the same opacity values: `opacity-100` for visible, `opacity-15` for filtered, `opacity-[0.06]` for scheme-dimmed.

### Step 6: Handle owned and brand indicators

- **Brand ring**: If `showBrandRing` is true, render a small colored dot or border segment for each brand in the group (corner dots or a thin bottom border with brand colors)
- **Owned ring**: If `showOwnedRing` is true and any paint in the group is owned, show a small indicator (e.g., a checkmark badge or a gold border)
- Keep these subtle — the grid is compact and indicators shouldn't overwhelm the color swatch

### Affected Files

| File | Changes |
|------|---------|
| `src/components/GridView.tsx` | New component — grid visualization with sorted swatches |
| `src/app/page.tsx` | Add `viewMode` state, toggle buttons, conditional rendering of Wheel vs Grid |
| `src/utils/colorUtils.ts` | Add `hexToLuminance()` and `comparePaintGroups()` sort utilities |
| `src/types/paint.ts` | Optionally add `ViewMode` type |

### Risks & Considerations

- **Performance**: 190+ paint groups as individual DOM elements is well within browser limits. No virtualization needed at current scale, but if paint count grows significantly (500+), consider `react-window` or similar.
- **Color perception**: Luminance-based sorting may not perfectly match human perception for all hues (e.g., saturated blue looks darker than saturated yellow at the same luminance). The `0.299R + 0.587G + 0.114B` formula is standard and well-accepted.
- **Multi-paint groups**: Groups with many paints sharing a hex should be clearly indicated. The count badge helps, but the click → expand → DetailPanel flow must work identically to the wheel.
- **Scheme matching in grid**: Color scheme wedges are visual on the wheel but have no spatial meaning in the grid. Scheme matching will still dim non-matching paints, but the wedge overlay won't render. This is expected — the grid is a complementary view, not a replacement.
- **View toggle and state**: Switching views should not reset selection, filters, or search. Only wheel-specific state (zoom, pan) is irrelevant in grid mode.
