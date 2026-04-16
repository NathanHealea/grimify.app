# Paint Data References

This document lists the authoritative sources used for each brand's paint hex
color values, along with data quality decisions and known gaps.

## Sources by Brand

### Citadel (341 paints)

| Source | URL | Coverage |
|--------|-----|----------|
| PaintPad.app — Citadel Painting System | https://paintpad.app/paints/citadel-painting-system | 341/341 (100%) |

### The Army Painter (461 paints)

| Source | URL | Coverage |
|--------|-----|----------|
| PaintPad.app — Warpaints Fanatic | https://paintpad.app/paints/the-army-painter-warpaints-fanatic | Acrylic, Effect, Metallic, Wash |
| PaintPad.app — Warpaints | https://paintpad.app/paints/the-army-painter-warpaints | Acrylic, Effect, Metallic, Wash |
| PaintPad.app — Warpaints Air | https://paintpad.app/paints/the-army-painter-warpaints-air | Air |
| PaintPad.app — Speedpaint 2.0 | https://paintpad.app/paints/the-army-painter-speedpaint-2-0 | Speedpaint |
| PaintPad.app — Masterclass | https://paintpad.app/paints/the-army-painter-masterclass | Masterclass |

Combined coverage: **460/461 (99.8%)**

Unmatched: Battleship Grey (Speedpaint) — not listed on PaintPad; retains original hex.

### Vallejo (763 paints)

| Source | URL | Coverage |
|--------|-----|----------|
| PaintPad.app — Model Color | https://paintpad.app/paints/vallejo-model-color | Model Color |
| PaintPad.app — Game Color | https://paintpad.app/paints/vallejo-game-color | Game Color, Ink, Metallic, Wash |
| PaintPad.app — Model Air | https://paintpad.app/paints/vallejo-model-air | Model Air |
| PaintPad.app — Game Air | https://paintpad.app/paints/vallejo-game-air | Game Air |
| PaintPad.app — Mecha Color | https://paintpad.app/paints/vallejo-mecha-color | Mecha Color |
| PaintPad.app — Metal Color | https://paintpad.app/paints/vallejo-metal-color | Metal Color |
| PaintPad.app — Xpress Color | https://paintpad.app/paints/vallejo-xpress | Xpress Color |
| PaintPad.app — Model Wash | https://paintpad.app/paints/vallejo-model-wash | Model Wash |
| PaintPad.app — Auxiliaries | https://paintpad.app/paints/vallejo-auxiliaries | Auxiliaries |
| PaintPad.app — Hobby Spray Paint | https://paintpad.app/paints/vallejo-hobby-spray-paint | Hobby Spray |
| PaintPad.app — Liquid Gold | https://paintpad.app/paints/vallejo-liquid-gold | Liquid Metal |
| PaintPad.app — Panzer Aces | https://paintpad.app/paints/vallejo-panzer-aces | Panzer Aces |
| PaintPad.app — Surface Primer | https://paintpad.app/paints/vallejo-surface-primer | Surface Primer |
| PaintPad.app — The Shifters | https://paintpad.app/paints/vallejo-the-shifters | Shifters |

Combined coverage: **716/763 (94%)**

Unmatched (47 paints): Primarily Game Color Ink (11), Game Color Wash (1), newer
Xpress Color paints (17+), and a few Model Color paints with abbreviated names
(e.g. "German Cam. Medium Brown"). These retain their original hex values.

### Green Stuff World (122 paints)

| Source | URL | Coverage |
|--------|-----|----------|
| PaintPad.app — Green Stuff World | https://paintpad.app/paints/green-stuff-world | 91/122 (75%) |

Unmatched (31 paints): Newer acrylic paints not yet listed on PaintPad (e.g.
"Red Truth", "Canary Green", "Vanilla Drop", "Chancellor Blue"). These retain
their original hex values.

### AK Interactive (650 paints)

| Source | URL | Coverage |
|--------|-----|----------|
| PaintPad.app — AK Interactive | https://paintpad.app/paints/ak-interactive | AK Interactive main line |
| PaintPad.app — 3rd Gen Acrylics | https://paintpad.app/paints/ak-interactive-3rd-gen-acrylics | 3rd Generation |
| PaintPad.app — Acrylics | https://paintpad.app/paints/ak-interactive-acrylics | Acrylics, Real Colors |
| PaintPad.app — Real Color | https://paintpad.app/paints/ak-interactive-real-color | Real Colors |
| PaintPad.app — Amsterdam Acrylic Ink | https://paintpad.app/paints/amsterdam-acrylic-ink | Amsterdam Ink |

Combined coverage: **611/650 (94%)**

Unmatched (39 paints): Primarily the Abteilung 502 oil paint line (38 paints)
which is not covered by PaintPad, plus 1 metallic paint. These retain their
original hex values.

## Overall Coverage

| Brand | Matched | Total | Coverage |
|-------|---------|-------|----------|
| Citadel | 341 | 341 | 100% |
| Army Painter | 460 | 461 | 99.8% |
| Vallejo | 716 | 763 | 94% |
| Green Stuff World | 91 | 122 | 75% |
| AK Interactive | 611 | 650 | 94% |
| **Total** | **2,219** | **2,337** | **95%** |

## Data Quality Decisions

### Metallic Paints

Metallic paints on PaintPad are represented using CSS `linear-gradient()`
backgrounds. For these paints, the `color:` CSS property value is used as the
base hex color (representing the dominant metallic tone without the sheen
effect). This is consistent across all brands.

### Translucent Paints (Washes, Inks, Contrast, Speedpaint)

Translucent paints (shades, washes, contrast paints, inks, speedpaints) are
displayed on PaintPad as solid color swatches representing how the paint
appears over a white or medium surface. These hex values are used as-is since
they provide a reasonable visual approximation for classification and
comparison purposes.

### Hex Format

All hex values follow the `#RRGGBB` uppercase format (e.g. `#FF8C00`).

### Unmatched Paints

Paints that could not be matched to a PaintPad entry retain their original hex
values from the initial data import. These are documented per-brand above.
Common reasons for non-matches:

- **Newer paint releases** not yet cataloged on PaintPad
- **Product line gaps** (e.g. Abteilung 502 oil paints)
- **Name discrepancies** between the JSON data and PaintPad (e.g. abbreviated
  names like "German Cam." vs full names)

### Known Remaining Gaps

1. **Abteilung 502 (AK Interactive)** — 38 oil paints with no PaintPad data
2. **Game Color Ink/Wash (Vallejo)** — 12 paints with naming mismatches
3. **Newer Xpress Color (Vallejo)** — 17+ paints not yet on PaintPad
4. **Newer GSW acrylics** — 31 paints not yet on PaintPad

### Hue Assignment Verification

After updating hex values, the hue assignment algorithm in `scripts/generate-seed.ts`
was verified. The current thresholds (`NEUTRAL_SATURATION_THRESHOLD = 15%`) produce
a reasonable distribution:

- 576 paints classified as Neutral (blacks, whites, greys, low-saturation browns)
- 1,761 paints distributed across 10 chromatic Munsell hue families
- 165 paints near the neutral boundary (10-20% saturation) are correctly classified
  as chromatic
- 8 very dark paints (L < 5%) with high mathematical saturation are classified as
  chromatic rather than neutral; this is acceptable since they retain their color
  identity (e.g. dark green, dark blue)

No changes to the `NEUTRAL_SATURATION_THRESHOLD`, `HUE_ANGLE_RANGES`, or
`COLOR_CATALOG` values were needed.

## Methodology

1. Each PaintPad brand page was fetched and parsed to extract paint names and
   hex color values from the HTML swatch elements.
2. Paint names were normalized (lowercased, non-alphanumeric characters removed)
   and matched against existing JSON entries.
3. For brands with product number prefixes (Vallejo: "70.740", AK: "AK11001"),
   the number prefix was stripped before matching.
4. Type-aware matching was used first (matching within the same product line),
   falling back to fuzzy name matching (>82% similarity) across types.
5. Updated hex values were written back to the JSON files in `#RRGGBB` format.

Data sourced: April 2026
