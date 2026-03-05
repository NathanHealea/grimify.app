# Split Complementary Zone Matching

**Epic:** Color Analysis
**Type:** Bug
**Status:** Todo

## Summary

The Split Complementary color scheme highlights every paint in the entire 120°–180° hue distance range instead of only paints near the two split complementary points (150° and 210° from the selected hue). This means paints between the two zones are incorrectly matched, making the scheme highlight far too many colors.

## Current Behavior

In `src/utils/colorUtils.ts`, the matching logic for split complementary is:

```ts
if (scheme === 'split') return d > 120 && d < 180;
```

This matches any paint with hue distance 120°–180° from the selected paint — a 60° wide band that covers the entire region between and around both split complementary points. Every paint in that range lights up.

Meanwhile, the visual wedges correctly point at the two split complementary positions:

```ts
wedges.push({ center: (hue + 150) % 360, span: 22, color: '#ff4' });
wedges.push({ center: (hue + 210) % 360, span: 22, color: '#ff4' });
```

The wedges are ±11° wide, but the matching logic is ±30° wide per zone — a mismatch.

## Expected Behavior

Only paints near the two split complementary points (hue+150° and hue+210°) should be highlighted. The matching zone should be comparable to the wedge indicator width, not the entire 120°–180° band.

## Acceptance Criteria

- [ ] Split complementary only highlights paints near hue+150° and hue+210° (not the full 120°–180° band)
- [ ] Matching zone width is consistent with the visual wedge indicators
- [ ] Complementary and analogous schemes are unaffected

## Implementation Plan

### Step 1 — Fix `isMatchingScheme` for split complementary

**File:** `src/utils/colorUtils.ts`

Replace the broad range check with distance checks from each split complementary center point:

```ts
if (scheme === 'split') {
  const splitA = (selectedHue + 150) % 360
  const splitB = (selectedHue + 210) % 360
  return hueDistance(paintHue, splitA) < 25 || hueDistance(paintHue, splitB) < 25
}
```

This checks if the paint is within 25° of either split complementary point. The 25° tolerance matches the complementary scheme's tolerance (which uses `d > 155`, meaning within 25° of 180°).

Both `hueDistance` calls handle wrap-around correctly since `hueDistance` already normalizes to the shortest angular distance.

### Step 2 — Update the color-scheme-modes doc

**File:** `docs/color-analysis/color-scheme-modes.md`

Update the matching rule table to reflect the corrected logic:

| Scheme               | Matching Rule                                      |
|----------------------|----------------------------------------------------|
| Split Complementary  | Within 25° of hue+150° or within 25° of hue+210°  |

### Files Changed

| File | Changes |
|------|---------|
| `src/utils/colorUtils.ts` | Fix `isMatchingScheme` split logic to use per-point distance checks |
| `docs/color-analysis/color-scheme-modes.md` | Update matching rule description |

## Risks & Considerations

- **Tolerance value:** 25° matches the complementary scheme's tolerance. Could be widened to ~30° if the zones feel too narrow in practice.
- **Wedge alignment:** The wedge span is 22° (±11°), while the matching tolerance is 25°. This slight difference means a few paints just outside the wedge visual will still match, which feels natural. Exact alignment (11°) would be too restrictive.
