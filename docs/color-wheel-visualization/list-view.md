# List View

**Epic:** Color Wheel Visualization
**Type:** Feature
**Status:** Todo

## Summary

An alternative list-based visualization that displays all paints as rows in a scrollable, sortable list — ordered from darkest (black #000000) to lightest (white #FFFFFF). Each row shows a color swatch, paint name, brand, hex value, and paint type, giving users a data-rich way to browse and find paints. When multiple paints share the same hex value, HSL components (hue, then saturation) are used as tiebreakers for deterministic ordering. The view mode toggle supports switching between all available views (Wheel, Grid, List). All existing functionality — brand filtering, search, color schemes, collection tracking, and paint selection — carries over to the list view.

## Acceptance Criteria

- [ ] List view displays all paints as rows in a scrollable list
- [ ] Each row shows: color swatch, paint name, brand name/icon, hex value, and paint type
- [ ] Paints are sorted from darkest to lightest using perceived luminance
- [ ] Paints with identical hex values are sub-sorted by HSL (hue, then saturation) for deterministic ordering
- [ ] View mode toggle supports all views (Wheel, Grid, List) — not just two
- [ ] Toggle buttons are visible and accessible on both desktop and mobile
- [ ] Clicking a row in the list selects the paint (opens DetailPanel, same as wheel)
- [ ] Brand filtering, search highlighting, color scheme matching, and owned indicators apply in list view
- [ ] Filtered/dimmed paints appear with reduced opacity (consistent with wheel behavior)
- [ ] Multi-paint groups (same hex) show an expandable row with sub-rows for each paint
- [ ] Selected paint row has a visible highlight
- [ ] Owned paints show an indicator (e.g., checkmark or badge) when owned ring is enabled
- [ ] List view is responsive — adapts layout for narrow viewports
- [ ] View mode persists during the session (not reset by filter changes)
- [ ] List scrolls smoothly with 190+ entries (no virtualization needed at current scale)

## Design Notes

- **Sort order**: Same as Grid View — primary sort by perceived luminance (`0.299*R + 0.587*G + 0.114*B`), sub-sorted by hue then saturation for identical hex values. Reuse `hexToLuminance()` and `comparePaintGroups()` from Grid View implementation.
- **Row layout**: Each row is a horizontal flex container:
  - Left: square color swatch (32-40px) showing the paint's hex color
  - Center: paint name (bold), brand name with icon, paint type (secondary text)
  - Right: hex value in monospace, owned indicator, brand ring dot
  - For multi-paint groups: a collapsed row showing the shared hex and paint count, expanding to reveal individual paint rows on click
- **Toggle placement**: The view mode toggle must support 3+ options. Use a DaisyUI `join` button group with Wheel / Grid / List buttons. The Grid View doc specifies a 2-way toggle — this feature extends it to 3-way. The `viewMode` state type becomes `'wheel' | 'grid' | 'list'`.
- **Dimming**: Same opacity cascade as wheel and grid — `opacity-15` for brand/search filtered, `opacity-[0.06]` for scheme-dimmed.
- **Mobile**: Rows should stack more compactly on narrow screens — hide hex value column and paint type, showing only swatch + name + brand icon. Full details available in DetailPanel on selection.
- **Search highlight**: When a search is active, matching rows get a subtle highlight border or background tint (e.g., `bg-primary/10`).

## File Structure

```
src/
  components/
    ListView.tsx              # New — list visualization component
  app/
    page.tsx                  # Modified — extend viewMode to include 'list', update toggle UI
  types/
    paint.ts                  # Modified — update ViewMode type to include 'list'
```

## Implementation Plan

### Step 1: Extend ViewMode type and state

**Prerequisite**: Grid View must be implemented first (or both implemented together), since they share the `viewMode` state and luminance sort utilities.

In `src/types/paint.ts`:
- Update the `ViewMode` type (or add if not yet present): `type ViewMode = 'wheel' | 'grid' | 'list'`

In `src/app/page.tsx`:
- Update the `viewMode` state type to include `'list'`
- The toggle UI (added by Grid View) needs a third button — handled in Step 3

### Step 2: Create ListView component

Create `src/components/ListView.tsx` as a `'use client'` component.

**Props** (same interface as GridView for consistency):
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
- `brands: Brand[]` — brand metadata for display (names, icons, colors)

**Rendering**:
- Sort `paintGroups` using the shared `comparePaintGroups` comparator via `useMemo`
- Render as a scrollable container (`overflow-y: auto`, `flex-1`) with a list of rows
- Each row is a `<button>` or clickable `<div>` with `role="button"`:
  ```
  ┌─────┬──────────────────────────────┬──────────┐
  │ ██  │ Paint Name        Brand Icon │  #hex    │
  │ ██  │ Type              Brand Name │  ● owned │
  └─────┴──────────────────────────────┴──────────┘
  ```
  - Swatch: `w-10 h-10 rounded` div with `backgroundColor` set to group hex
  - Text: paint name in `font-medium`, brand icon + name and type in `text-sm text-base-content/60`
  - Hex: monospace `font-mono text-sm text-base-content/40`
  - Owned indicator: small checkmark or dot when `showOwnedRing` and paint is owned
  - For single-paint groups: show paint details directly
  - For multi-paint groups: show hex + count ("3 paints"), expandable on click to reveal individual rows indented below

**Row states**:
- Default: `hover:bg-base-200` for hover feedback
- Selected: `bg-base-300 ring-1 ring-primary` or similar highlight
- Dimmed: same opacity cascade as other views
- Search match: `bg-primary/10` subtle highlight when search is active and paint matches

**Interaction handlers**:
- `onClick` → call `onGroupClick(group)` (same selection logic as wheel/grid)
- `onMouseEnter` → call `onHoverGroup(group)`
- `onMouseLeave` → call `onHoverGroup(null)`

### Step 3: Update view mode toggle to 3-way

In `src/app/page.tsx`, update the toggle buttons to include all three views:

```tsx
<div className="join">
  <button className={`join-item btn btn-sm ${viewMode === 'wheel' ? 'btn-active' : ''}`}
    onClick={() => setViewMode('wheel')}>Wheel</button>
  <button className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-active' : ''}`}
    onClick={() => setViewMode('grid')}>Grid</button>
  <button className={`join-item btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
    onClick={() => setViewMode('list')}>List</button>
</div>
```

Add Heroicons if desired: a circle for Wheel, `Squares2X2Icon` for Grid, `ListBulletIcon` for List.

### Step 4: Add conditional rendering for list view

In `src/app/page.tsx`, extend the conditional rendering in `<main>`:

```tsx
{viewMode === 'wheel' && <ColorWheel ... />}
{viewMode === 'grid' && <GridView ... />}
{viewMode === 'list' && <ListView ... />}
```

- Pass the same filter/selection/interaction props to `<ListView>` as the other views
- Additionally pass `brands` prop for display purposes
- The reset button and zoom indicator should only show when `viewMode === 'wheel'`
- The stats overlay shows in all views

### Step 5: Wire up filtering, dimming, and indicators

Apply the same filtering cascade used by ColorWheel and GridView. For each paint group row:

1. Check `brandFilter` — if active and no paint in group matches, dim
2. Check `searchMatchIds` — if search active and no paint matches, dim (also add search highlight to matches)
3. Check `isSchemeMatching` — if scheme active and no paint matches, scheme-dim
4. Check `ownedFilter` — if active and no paint is owned, dim

**Brand indicators**: If `showBrandRing`, show a small colored dot next to brand name using the brand's color.

**Owned indicators**: If `showOwnedRing` and any paint in the group is owned, show a small checkmark or "Owned" badge.

### Step 6: Handle multi-paint group expansion

For groups where `paints.length > 1`:
- Render a summary row showing the hex color swatch, hex value, and "N paints" label
- On click, toggle expansion to show individual paint rows indented beneath
- Track expanded groups with local state: `const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())`
- Each sub-row click calls `onGroupClick` with the specific paint selected (via `handleSelectPaintFromGroup` callback from page)
- Add a slight left indent (`pl-4`) and smaller swatch for sub-rows to visually differentiate them

### Step 7: Mobile responsiveness

For narrow viewports (`< md` breakpoint):
- Hide hex value and paint type columns
- Reduce swatch size to `w-8 h-8`
- Show only paint name + brand icon on the main row
- Full paint details are accessible through the DetailPanel when a paint is selected
- Rows should have comfortable touch targets (`min-h-12`)

### Affected Files

| File | Changes |
|------|---------|
| `src/components/ListView.tsx` | New component — list visualization with sorted, expandable rows |
| `src/app/page.tsx` | Extend `viewMode` to `'list'`, update toggle to 3-way, add ListView conditional render |
| `src/types/paint.ts` | Update `ViewMode` type to include `'list'` |

### Risks & Considerations

- **Dependency on Grid View**: This feature shares the `viewMode` state infrastructure and `comparePaintGroups` sort utility introduced by Grid View. Implement Grid View first, or implement both together to avoid rework on the toggle.
- **Multi-paint group UX**: Expanding/collapsing groups adds interaction complexity. Keep it simple — click to expand, click again to collapse. Selection of a specific sub-paint should also close the expansion and show it in DetailPanel.
- **Performance**: 190+ rows is trivial for the DOM. No virtualization needed at current scale. If paint count grows past 500+, consider `react-window`.
- **View toggle consistency**: The Grid View doc specifies a 2-way Wheel/Grid toggle. When implementing, the toggle should be built as 3-way from the start (or updated when this feature is added). The `ViewMode` type should be the single source of truth.
- **Scheme matching display**: Unlike the wheel, there's no spatial representation of color schemes in a list. Scheme matching only affects dimming/highlighting. This is expected and consistent with the grid approach.
- **Accessibility**: List rows should be keyboard-navigable. Use proper `role="listbox"` / `role="option"` semantics or a native `<ul>` with clickable `<li>` elements. Ensure focus indicators are visible.
