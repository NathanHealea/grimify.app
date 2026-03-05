# Detail Panel

**Epic:** Paint Information
**Type:** Feature
**Status:** In Progress

## Summary

A panel that displays detailed information for the selected or hovered paint, including color swatch, brand info, color values, duplicates, and matching paints.

## Acceptance Criteria

- [x] Displays a color swatch with glow shadow
- [x] Shows paint name, brand, and brand icon
- [x] Shows paint type and finish (currently all Matte)
- [x] Shows hex value
- [x] Shows HSL breakdown with numeric values and visual gradient sliders for Hue, Saturation, and Lightness
- [x] Duplicate detection lists all paints sharing the same hex code across brands
- [x] Scheme/search matches section shows a scrollable list of paints matching the active color scheme or search query
- [x] When no color is selected, the panel shows the color black, with `--` for string values and `0` for numeric values

## Current State

The `PaintDetails` component lives inline in `src/app/page.tsx` (lines 12-93). It already handles:
- Group-aware rendering (multi-paint list with "Same color" back button)
- Paint name, brand icon, brand name
- Hex value display
- HSL numeric values (text only, no sliders)
- Paint type (but not finish)
- Color swatch (plain, no glow shadow)
- Default state shows "Select a paint to see details" text (needs black swatch + placeholder values)

The sibling project `miniature-colors.nathanhealea.com` has a working `DetailPanel.tsx` with glow shadow, HSL gradient sliders, type/finish fields, and scheme/search matches section. Adapt patterns from it but use Tailwind/DaisyUI classes instead of inline styles.

## Implementation Plan

### Step 1: Extract DetailPanel to its own component

**File:** `src/components/DetailPanel.tsx` (new), `src/app/page.tsx` (modify)

Move the `PaintDetails` function from `page.tsx` into a new `DetailPanel.tsx` component file. Rename it to `DetailPanel` to match the doc name and sibling project convention.

Update `DetailPanelProps` to include future-ready props for scheme/search:

```tsx
import type { PaintGroup, ProcessedPaint } from '@/types/paint'
import type { Brand } from '@/types/paint'

interface DetailPanelProps {
  group: PaintGroup | null
  selectedPaint: ProcessedPaint | null
  onSelectPaint: (paint: ProcessedPaint) => void
  onBack: () => void
  brands: Brand[]
  matches: ProcessedPaint[]
  hasSearch: boolean
  scheme: string
}
```

Pass `brands` as a prop instead of importing directly — keeps the component pure. The `matches`, `hasSearch`, and `scheme` props will be empty/default until those features are implemented.

In `page.tsx`, import and use `<DetailPanel />` where `<PaintDetails />` was.

#### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/DetailPanel.tsx` | Create | New component extracted from page.tsx |
| `src/app/page.tsx` | Modify | Remove inline PaintDetails, import DetailPanel |

---

### Step 2: Default state — black swatch with placeholder values

**File:** `src/components/DetailPanel.tsx`

When `group` is `null`, render a full detail layout with default values instead of the current text placeholder. This gives users a visual preview of what the panel looks like before they select a paint.

```tsx
if (!group) {
  return (
    <div className="flex flex-col gap-3">
      {/* Black swatch */}
      <div className="flex items-center gap-3">
        <div
          className="size-12 shrink-0 rounded-lg border-2 border-base-300"
          style={{ backgroundColor: '#000000' }}
        />
        <div>
          <p className="text-sm font-semibold">--</p>
          <p className="text-xs text-base-content/60">--</p>
        </div>
      </div>
      {/* Grid with placeholder values */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-base-content/60">Hex</span>
        <span className="font-mono">--</span>
        <span className="text-base-content/60">Type</span>
        <span>--</span>
        <span className="text-base-content/60">Finish</span>
        <span>--</span>
      </div>
      {/* HSL sliders at 0 */}
      {/* (render gradient bars with indicators at 0% position) */}
    </div>
  )
}
```

---

### Step 3: Color swatch with glow shadow

**File:** `src/components/DetailPanel.tsx`

Update the swatch div (currently `size-8`) to be larger and add a glow shadow using the paint's hex color. The shadow creates a colored glow effect around the swatch.

```tsx
<div
  className="size-12 shrink-0 rounded-lg border-2 border-base-300"
  style={{
    backgroundColor: paint.hex,
    boxShadow: `0 0 18px ${paint.hex}55`,
  }}
/>
```

The `55` suffix on the hex color adds ~33% opacity to the shadow, creating a subtle glow without being overwhelming.

---

### Step 4: Add finish display

**File:** `src/components/DetailPanel.tsx`

Add a "Finish" row to the info grid. Since the paint data currently has no `finish` field, hardcode `"Matte"` as the default value. When finish data is added to the paint database later, this can read from `paint.finish ?? 'Matte'`.

```tsx
<span className="text-base-content/60">Type</span>
<span>{paint.type}</span>
<span className="text-base-content/60">Finish</span>
<span>Matte</span>
```

---

### Step 5: HSL gradient sliders

**File:** `src/components/DetailPanel.tsx`

Replace the current single-line HSL text display with three visual gradient slider bars, each showing a label, gradient background, position indicator, and numeric value.

Each slider has:
- A letter label (`H`, `S`, `L`)
- A gradient bar showing the full range of that HSL component
- A white indicator positioned at the paint's value
- A numeric value at the end

```tsx
const hsl = hexToHsl(paint.hex)

const sliders = [
  {
    label: 'H',
    value: Math.round(hsl.h),
    unit: '°',
    percent: (hsl.h / 360) * 100,
    gradient: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
  },
  {
    label: 'S',
    value: Math.round(hsl.s * 100),
    unit: '%',
    percent: hsl.s * 100,
    gradient: `linear-gradient(to right, #888, ${paint.hex})`,
  },
  {
    label: 'L',
    value: Math.round(hsl.l * 100),
    unit: '%',
    percent: hsl.l * 100,
    gradient: 'linear-gradient(to right, #000, #888, #fff)',
  },
]
```

Render each slider:

```tsx
<div className="flex flex-col gap-1">
  {sliders.map(({ label, value, unit, percent, gradient }) => (
    <div key={label} className="flex items-center gap-2">
      <span className="w-3 text-[8px] text-base-content/40">{label}</span>
      <div className="relative h-2 flex-1 rounded-full" style={{ background: gradient }}>
        <div
          className="absolute -top-0.5 h-3 w-1 rounded-sm border border-black bg-white"
          style={{ left: `${percent}%`, transform: 'translateX(-1px)' }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[10px] text-base-content/60">
        {value}{unit}
      </span>
    </div>
  ))}
</div>
```

---

### Step 6: Scheme/search matches section

**File:** `src/components/DetailPanel.tsx`

Add a scrollable list section at the bottom of the panel that shows paints matching the active color scheme or search query. This section only renders when `matches.length > 0`.

```tsx
{matches.length > 0 && (
  <div>
    <h4 className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-base-content/40">
      {hasSearch ? 'Search results' : `${scheme} matches`} ({matches.length})
    </h4>
    <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto">
      {matches.map((match) => {
        const matchBrand = brands.find((b) => b.id === match.brand)
        return (
          <button
            key={match.id}
            className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-base-300"
            onClick={() => onSelectPaint(match)}
          >
            <div
              className="size-3 shrink-0 rounded border border-base-300"
              style={{ backgroundColor: match.hex }}
            />
            <span className="truncate text-xs">{match.name}</span>
            <span className="ml-auto text-[10px] text-base-content/40">
              {matchBrand?.icon}
            </span>
          </button>
        )
      })}
    </div>
  </div>
)}
```

When no search or scheme is active, `matches` will be an empty array and this section won't render.

Also render this section in the **default state** (no paint selected) when `hasSearch && matches.length > 0` — showing search results even without a selection, matching the sibling project's behavior.

---

### Step 7: Wire props from page.tsx

**File:** `src/app/page.tsx`

Pass the new props to `DetailPanel`:

```tsx
<DetailPanel
  group={displayGroup}
  selectedPaint={hoveredGroup ? null : selectedPaint}
  onSelectPaint={(paint) => {
    if (displayGroup) handleSelectPaintFromGroup(paint, displayGroup)
  }}
  onBack={() => setSelectedPaint(null)}
  brands={brands}
  matches={[]}
  hasSearch={false}
  scheme="None"
/>
```

For now, `matches` is `[]`, `hasSearch` is `false`, and `scheme` is `"None"`. When the Search feature (Epic 6) and Color Scheme Modes feature (Epic 6) are implemented, these values will be computed from state and passed through.

#### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/app/page.tsx` | Modify | Pass matches, hasSearch, scheme, brands to DetailPanel |

---

## Risks & Considerations

- **Inline styles for gradients:** The HSL gradient sliders use inline `style` for the `background` property because Tailwind doesn't support dynamic gradient stops. The indicator position also uses inline style for the same reason. All other styling uses Tailwind classes.
- **Finish field:** Currently hardcoded to "Matte" since paint data doesn't include finish. When finish data is added to the paint database, update this to read from the data.
- **Scheme/search props are stubs:** The `matches`, `hasSearch`, and `scheme` props pass empty defaults until Epic 6 features are built. The UI is ready to render results immediately once those features provide data.
- **Component extraction:** Moving `PaintDetails` to its own file requires passing `brands` as a prop (currently imported directly). This keeps the component testable and decoupled from the data layer.
