# Emphasize Collection Paints on the Color Wheel

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Todo
**Branch:** `feature/wheel-collection-emphasis`
**Merge into:** `main`

## Summary

When a user is authenticated, paint markers on both the Munsell and HSL wheels that belong to their collection are visually emphasized with a distinct ring/halo so they can immediately see where their paints fall in color space. Unauthenticated users see no visual difference.

## Acceptance Criteria

- [ ] Collection paints are visually distinguished on both the Munsell and HSL wheels
- [ ] The emphasis ring scales correctly with zoom (stays the same apparent screen size)
- [ ] Collection paints render on top of non-collection paints so the ring is never obscured
- [ ] Unauthenticated users see no visual difference (no ring, no layout change)
- [ ] Emphasis is compatible with active filters — only visible emphasized markers remain when filters are applied
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Modify | `src/modules/color-wheel/components/paint-marker.tsx` | Add `emphasized` prop; render a gold outer ring when true |
| Modify | `src/modules/color-wheel/components/munsell-color-wheel.tsx` | Accept `userPaintIds`; split paint render order; pass `emphasized` to `PaintMarker` |
| Modify | `src/modules/color-wheel/components/hsl-color-wheel.tsx` | Accept `userPaintIds`; split paint render order; pass `emphasized` to `PaintMarker` |
| Modify | `src/modules/color-wheel/components/color-wheel-container.tsx` | Pass `userPaintIds` down to both wheel components |

## Implementation

### 1. Add `emphasized` prop to `PaintMarker`

**File:** `src/modules/color-wheel/components/paint-marker.tsx`

The current props object (`paint`, `cx`, `cy`, `onHover`, `onClick?`, `zoom?`) lives inline on the function signature at line 32. Add `emphasized?: boolean` (default `false`).

When `emphasized` is true, render an outer ring behind the marker using gold stroke (`#f59e0b`). Wrap both the ring and the marker in a `<g>` for explicit grouping.

**Circle case** — add a ring `<circle>` before the main circle:

```tsx
if (paint.is_metallic) { /* ... diamond branch below ... */ }

if (emphasized) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 3 / zoom} fill="none" stroke="#f59e0b" strokeWidth={2 / zoom} />
      <circle cx={cx} cy={cy} r={r} {...shared} />
    </g>
  )
}

return <circle cx={cx} cy={cy} r={r} {...shared} />
```

**Diamond (metallic) case** — the existing half-diagonal is `d = r * 1.4`. The ring half-diagonal scales proportionally: `dRing = (r + 3 / zoom) * 1.4`. Compute ring points with `dRing`, render behind the main diamond:

```tsx
if (paint.is_metallic) {
  const d = r * 1.4
  const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`
  if (emphasized) {
    const dRing = (r + 3 / zoom) * 1.4
    const ringPoints = `${cx},${cy - dRing} ${cx + dRing},${cy} ${cx},${cy + dRing} ${cx - dRing},${cy}`
    return (
      <g>
        <polygon points={ringPoints} fill="none" stroke="#f59e0b" strokeWidth={2 / zoom} />
        <polygon points={points} {...shared} />
      </g>
    )
  }
  return <polygon points={points} {...shared} />
}
```

Update the JSDoc `@param` block to document `emphasized`.

### 2. Thread `userPaintIds` to both wheel components

**File:** `src/modules/color-wheel/components/color-wheel-container.tsx`

`userPaintIds?: Set<string>` already arrives at `ColorWheelContainer` (line 36) and is used for filter state. It is **not yet passed** to the wheel components (lines 82–85). Update both JSX calls:

```tsx
{view === 'munsell' ? (
  <MunsellColorWheel paints={filteredPaints} hues={hues} userPaintIds={userPaintIds} />
) : (
  <HslColorWheel paints={filteredPaints} userPaintIds={userPaintIds} />
)}
```

### 3. Update `MunsellColorWheel`

**File:** `src/modules/color-wheel/components/munsell-color-wheel.tsx`

Add `userPaintIds?: Set<string>` to the component props at line 73. Update the JSDoc `@param` block.

Split the paint array before the marker render block (currently a single `paints.map` at line 146). Place the split immediately before the `<svg>` return, after `hueIdToCell` is built:

```tsx
const ownedPaints = userPaintIds ? paints.filter((p) => userPaintIds.has(p.id)) : []
const otherPaints = userPaintIds ? paints.filter((p) => !userPaintIds.has(p.id)) : paints
```

Replace the single `paints.map` with two sequential blocks — `otherPaints` first (renders underneath), `ownedPaints` second (renders on top so the ring is never obscured):

```tsx
{otherPaints.map((paint) => {
  const cell = paint.hue_id ? hueIdToCell.get(paint.hue_id) : undefined
  const { x, y } = cell
    ? hueCellPosition(cell, paint.id, OUTER_RADIUS)
    : hslToPosition(paint.hue, paint.lightness, OUTER_RADIUS)
  return (
    <PaintMarker key={paint.id} paint={paint} cx={x} cy={y} zoom={zoom} onHover={handleHover} onClick={handlePaintClick} />
  )
})}
{ownedPaints.map((paint) => {
  const cell = paint.hue_id ? hueIdToCell.get(paint.hue_id) : undefined
  const { x, y } = cell
    ? hueCellPosition(cell, paint.id, OUTER_RADIUS)
    : hslToPosition(paint.hue, paint.lightness, OUTER_RADIUS)
  return (
    <PaintMarker key={paint.id} paint={paint} cx={x} cy={y} zoom={zoom} onHover={handleHover} onClick={handlePaintClick} emphasized />
  )
})}
```

When `userPaintIds` is `undefined`, all paints flow through `otherPaints` with no emphasis, preserving unauthenticated behavior.

### 4. Update `HslColorWheel`

**File:** `src/modules/color-wheel/components/hsl-color-wheel.tsx`

Add `userPaintIds?: Set<string>` to the component props at line 92. Update the JSDoc `@param` block.

Apply the identical split pattern inside the `<g id="paint-markers">` block (currently a single `paints.map` at line 284):

```tsx
const ownedPaints = userPaintIds ? paints.filter((p) => userPaintIds.has(p.id)) : []
const otherPaints = userPaintIds ? paints.filter((p) => !userPaintIds.has(p.id)) : paints
```

Replace the single map with two ordered blocks using `paintToWheelPosition` (the existing position utility), passing `emphasized` to `ownedPaints` markers.

## Risks & Considerations

- **Ring color contrast.** Gold (`#f59e0b`) reads well against both dark and light sectors. Avoid white (same as the existing marker stroke) or the paint's own hex color.
- **Metallic diamond ring.** The emphasized ring for metallic paints uses a slightly scaled-up diamond polygon with the same gold stroke — keep the scaling factor consistent with the circle case (`r + 3/zoom` maps to `d * 1.4 + 3/zoom` for the diamond half-diagonal).
- **Filter interaction.** Because filtering happens in `ColorWheelContainer` before the `paints` array reaches the wheel, emphasized filtering is automatic — only visible paints are passed down, so only visible collection paints get the ring.
- **Zoom invariance.** The ring strokeWidth and offset both divide by `zoom`, matching the existing marker geometry convention.
- **Empty collection.** When `userPaintIds` is an empty `Set`, `ownedPaints` is `[]` and nothing changes visually — no special case needed.
