# Scheme Selected Zone Matching

**Epic:** Color Analysis
**Type:** Bug
**Status:** In Progress

## Summary

When a color scheme is active (complementary, split complementary, or analogous), the app highlights paints in the scheme's target zones but does not highlight paints that fall in the **selected color's own zone**. For example, selecting a red paint with complementary scheme active highlights teal paints (opposite side) but dims all other red paints near the selection. The selected zone's white wedge is rendered visually but its paints are not included in the match results.

## Acceptance Criteria

- [x] When any color scheme is active, paints near the selected paint's hue (within the white wedge zone) are included as scheme matches
- [x] The selected zone paints appear highlighted (not dimmed) on the color wheel
- [x] The selected zone paints appear in the scheme matches list in the detail panel
- [x] Analogous scheme continues to work correctly (it already includes nearby hues via `d < 45`)
- [x] The existing scheme-specific matching logic remains unchanged for complementary and split complementary target zones

## Implementation Plan

The bug is in `isMatchingScheme()` in `src/utils/colorUtils.ts`. Each scheme only checks its target zone(s) but none include the selected paint's own hue zone. The white wedge in `getSchemeWedges()` uses a span of 22°, so the matching threshold should be consistent.

### Step 1: Add selected zone check to `isMatchingScheme()`

In `src/utils/colorUtils.ts`, add an early return at the top of the function (after the `none` check) that includes paints within the selected zone:

```typescript
export function isMatchingScheme(paintHue: number, selectedHue: number, scheme: string): boolean {
  if (scheme === 'none') return true;
  const d = hueDistance(selectedHue, paintHue);
  // Always include paints in the selected color's own zone
  if (d < 22) return true;
  if (scheme === 'complementary') return d > 155;
  // ... rest unchanged
}
```

The threshold of 22° matches the white wedge span in `getSchemeWedges()`.

### Step 2: Verify no side effects

The analogous scheme already returns true for `d < 45`, which is a superset of `d < 22`, so the new check is redundant but harmless for that scheme. No other logic changes are needed.

### Affected Files

| File | Changes |
|------|---------|
| `src/utils/colorUtils.ts` | Add `if (d < 22) return true` early return in `isMatchingScheme()` |

### Risks & Considerations

- The 22° threshold matches the visual wedge span. If the wedge span changes in the future, these should stay in sync — consider extracting a shared constant.
- The analogous scheme's 45° threshold already covers the 22° zone, so behavior is unchanged for that scheme.
