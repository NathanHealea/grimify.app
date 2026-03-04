# Color Scheme Modes

**Epic:** Color Analysis
**Type:** Feature
**Status:** Todo

## Summary

Select a paint then choose a color scheme to highlight matching paints on the wheel. Non-matching paints dim to near-invisible. Matching regions are shown as translucent wedge overlays.

## Acceptance Criteria

- [ ] User can select a color scheme after selecting a paint
- [ ] Complementary scheme highlights paints with hue distance > 155°
- [ ] Split Complementary scheme highlights paints with hue distance between 120°–180°
- [ ] Analogous scheme highlights paints with hue distance < 45°
- [ ] Non-matching paints dim to near-invisible when a scheme is active
- [ ] Matching regions are shown as translucent wedge overlays on the wheel
- [ ] A "No Scheme" option shows all paints without filtering

| Scheme               | Matching Rule                  |
|----------------------|--------------------------------|
| Complementary        | Hue distance > 155°            |
| Split Complementary  | Hue distance between 120°–180° |
| Analogous            | Hue distance < 45°             |
