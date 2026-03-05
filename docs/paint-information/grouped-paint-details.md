# Grouped Paint Details

**Epic:** Paint Information
**Type:** Refactor
**Status:** Todo

## Summary

When clicking a paint group with multiple paints sharing the same hex color, the Detail Panel currently hides the color details section and shows only a list of paints in the group. This refactor changes the behavior so the color details (swatch, hex, HSL sliders, type, finish) are always visible, with the list of duplicate paints displayed below the details.

## Current Behavior

1. Click a multi-paint group → Detail Panel shows **only** a paint list (no swatch, no hex, no HSL sliders)
2. Click a paint from that list → shows full details with a "← Same color (N)" back button
3. Click back → returns to the list-only view

This is jarring because clicking a color on the wheel hides the color information the user expects to see.

## Desired Behavior

1. Click a multi-paint group → Detail Panel shows **full color details** (using the representative paint) with the duplicate paint list below
2. Click a specific paint from the list → details update to show that paint's brand/type info; the list stays visible with the selected paint highlighted
3. No "back" button needed — the list is always visible when the group has multiple paints

## Acceptance Criteria

- [ ] Clicking a multi-paint group shows color details (swatch, hex, HSL, type, finish) immediately
- [ ] The list of duplicate paints appears below the color details
- [ ] Clicking a paint in the list updates the details to show that paint's info
- [ ] The selected paint in the list is visually highlighted
- [ ] Single-paint groups behave the same as before (no list shown)

## Implementation Plan

### Step 1 — Auto-select `rep` paint for multi-paint groups

**File:** `src/app/page.tsx`

In `handleGroupClick`, change the multi-paint branch to auto-select the `rep` paint instead of setting `selectedPaint` to `null`:

```ts
} else {
  setSelectedGroup(group)
  setSelectedPaint(group.rep) // was: setSelectedPaint(null)
}
```

This ensures `selectedPaint` is always set when a group is selected, so the detail panel always has a paint to display.

### Step 2 — Merge the detail and list views in DetailPanel

**File:** `src/components/DetailPanel.tsx`

Remove the third render path (lines 205–237) — the "list only" view. Since `selectedPaint` is now always set when a group is selected, the `paint` variable on line 153 will always resolve to a paint when a group is active.

In the existing paint-detail view (lines 155–203), replace the "← Same color" back button with an inline duplicate paint list that renders when `group.paints.length > 1`:

```tsx
{group.paints.length > 1 && (
  <div>
    <h4 className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-base-content/40">
      Same color ({group.paints.length})
    </h4>
    <div className="flex flex-col gap-0.5">
      {group.paints.map((p) => {
        const b = brands.find((b) => b.id === p.brand)
        const isActive = p.id === paint.id
        return (
          <button
            key={p.id}
            className={`flex items-center gap-2 rounded px-2 py-1 text-left ${isActive ? 'bg-base-300' : 'hover:bg-base-300'}`}
            onClick={() => onSelectPaint(p)}
          >
            <div className="size-3 shrink-0 rounded border border-base-300" style={{ backgroundColor: p.hex }} />
            <span className="truncate text-xs">{p.name}</span>
            <span className="ml-auto text-[10px] text-base-content/40">{b?.icon}</span>
          </button>
        )
      })}
    </div>
  </div>
)}
```

Place this between the HSL sliders and the MatchesList. The selected paint gets `bg-base-300` to indicate it's the currently displayed paint.

### Step 3 — Remove the `onBack` prop

**File:** `src/components/DetailPanel.tsx`, `src/app/page.tsx`

Since there's no longer a "back" button or list-only view, remove the `onBack` prop from `DetailPanelProps` and its usage in `page.tsx`.

### Files Changed

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Auto-select `rep` in `handleGroupClick`, remove `onBack` prop |
| `src/components/DetailPanel.tsx` | Remove list-only view, add inline duplicate list to detail view, remove `onBack` prop |

## Risks & Considerations

- **All paints in a group share the same hex** — so the swatch, hex value, and HSL sliders are identical regardless of which paint is selected. Only brand, name, and type change. This makes always showing the details a natural choice.
- **Hover behavior** — when hovering over a multi-paint group, the `displayGroup` logic in `page.tsx` already sets the group with `hoveredGroup`. Since `hoveredGroup` passes `selectedPaint` as `null` for hovers (line 239), ensure the hover path also resolves a paint. The existing `paint = selectedPaint ?? (group.paints.length === 1 ? group.rep : null)` fallback on line 153 needs to change to always fall back to `group.rep`.
