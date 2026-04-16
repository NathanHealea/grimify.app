# Paint Database Data Improvement

**Epic:** Paint Data & Search
**Type:** Enhancement
**Status:** Done
**Branch:** `enhancement/paint-database-data-improvement`
**Merge into:** `v1/main`

## Summary

Improve the quality and accuracy of paint data in the Grimify database. The current seed data uses hex values from the original JSON source files, many of which are estimated (especially for translucent, metallic, and technical paints). This enhancement will source accurate hex and HSL values from manufacturer and community reference sites, and ensure every paint is correctly associated with the right Munsell principal hue and ISCC-NBS sub-hue.

### Current State

- **2,337 paints** across 5 brands seeded from `scripts/data/paints/*.json`
- Hex values in the JSON files are a mix of sourced and estimated values (see `src/data/REFERENCES.md` on `main`)
- HSL values are computed from hex via `rgbToHsl()` in `scripts/generate-seed.ts`
- Hue assignments use `findClosestColor()` which matches paints to the nearest ISCC-NBS sub-hue by RGB Euclidean distance — accuracy depends entirely on the hex value being correct
- **Known data quality issues:**
  - Translucent paints (Contrast, Shade, Speedpaint, Wash, Ink, Xpress Color) have placeholder/estimated hex values that don't represent the paint's actual appearance on a model
  - Metallic paints have flat hex approximations that lose the metallic quality
  - Some paints may have incorrect hex values copied from similar-sounding paints
  - Hue assignments can be wrong when the source hex is inaccurate (e.g., a warm brown paint mapped to Neutral instead of Yellow-Red)

### Goals

1. **Source accurate hex values** — Extract real hex/HSL color data from manufacturer sites and community databases for all 2,337 paints
2. **Fix hue associations** — With corrected hex values, the `findClosestColor()` algorithm will produce better hue assignments; additionally, review and manually correct edge cases where algorithmic matching fails
3. **Enable accurate visualization** — Correct color data is the foundation for the color wheel, cross-brand comparison, and scheme exploration features

## Acceptance Criteria

- [x] Hex values for all Citadel paints (341) are verified against reference sources
- [x] Hex values for all Army Painter paints (461) are verified against reference sources
- [x] Hex values for all Vallejo paints (763) are verified against reference sources
- [x] Hex values for all Green Stuff World paints (122) are verified against reference sources
- [x] Hex values for all AK Interactive paints (650) are verified against reference sources
- [x] RGB and HSL values are recomputed from corrected hex values
- [x] Hue assignments (`hue_id`) are recalculated from corrected color data
- [x] Edge-case paints (metallics, washes, technical paints) have documented hex value decisions
- [x] Seed generator produces updated `supabase/seed.sql` with corrected data
- [ ] `npm run db:reset` applies cleanly with no errors
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Establish reference data sources

Identify and document the authoritative sources for each brand's paint hex values. The user will provide example sites and data. Potential sources include:

- **Citadel** — Games Workshop product pages, Citadel Colour app exports, community databases
  - https://paintpad.app/paints/citadel-painting-system
- **Army Painter** — The Army Painter website swatches, Fanatic paint range data
  - https://paintpad.app/paints/the-army-painter-masterclass
  - https://paintpad.app/paints/the-army-painter-speedpaint-2-0
  - https://paintpad.app/paints/the-army-painter-warpaints
  - https://paintpad.app/paints/the-army-painter-warpaints-air
  - https://paintpad.app/paints/the-army-painter-warpaints-fanatic
- **Vallejo** — Vallejo official color charts, acrylicosvallejo.com product pages
  - https://paintpad.app/paints/vallejo-auxiliaries
  - https://paintpad.app/paints/vallejo-game-air
  - https://paintpad.app/paints/vallejo-game-color
  - https://paintpad.app/paints/vallejo-hobby-spray-paint
  - https://paintpad.app/paints/vallejo-liquid-gold
  - https://paintpad.app/paints/vallejo-mecha-color
  - https://paintpad.app/paints/vallejo-metal-color
  - https://paintpad.app/paints/vallejo-model-air
  - https://paintpad.app/paints/vallejo-model-color
  - https://paintpad.app/paints/vallejo-model-wash
  - https://paintpad.app/paints/vallejo-panzer-aces
  - https://paintpad.app/paints/vallejo-surface-primer
  - https://paintpad.app/paints/vallejo-the-shifters
  - https://paintpad.app/paints/vallejo-xpress
- **Green Stuff World** — greenstuffworld.com product listings
  - https://paintpad.app/paints/green-stuff-world
- **AK Interactive** — ak-interactive.com product catalog
  - https://paintpad.app/paints/ak-interactive
  - https://paintpad.app/paints/ak-interactive-3rd-gen-acrylics
  - https://paintpad.app/paints/ak-interactive-acrylics
  - https://paintpad.app/paints/ak-interactive-real-color
  - https://paintpad.app/paints/amsterdam-acrylic-ink

Create a reference document at `scripts/data/REFERENCES.md` listing the sources used for each brand's color data.

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/REFERENCES.md` | New or updated — document all reference sources |

#### HTML Parsing for paintpad.app

##### Paint Type (Section)

Heading 2 Content contains paint type.

```html
<h2 class="paint-collection__paint_type___heading">...</h2>
```

##### Visual Color Representing  

`style="background: rgb(DDD,DDD,DDD)` can be parsed from

```html
<span class="paint-swatch__sample" style="background: rgb(74, 176, 106); color: rgb(74, 176, 106);"></span>
```

Value that can transformed to application Paint `r`, `g`, `b`, `hex` and `hue`, `saturation`, and `lightness` values.

Metallic and some other paints use a variety of colors to as representation

```html
<span class="paint-swatch__sample" style="background: linear-gradient(90deg, rgb(70, 61, 34) 0%, rgb(125, 107, 61) 50%, rgb(228, 195, 112) 100%); color: rgb(70, 61, 34);"></span>
```

### Step 2: Update paint JSON data files

For each brand, update the hex values in `scripts/data/paints/*.json`:

1. Cross-reference each paint's current hex value against the reference sources
2. Replace inaccurate hex values with sourced values
3. For paints where no authoritative hex exists (e.g., discontinued, technical), document the decision in the JSON's `description` field or a separate notes file
4. Validate hex format consistency (`#RRGGBB` uppercase)

This is the most labor-intensive step and may be done brand-by-brand.

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/paints/citadel.json` | Update hex values |
| `scripts/data/paints/army-painter.json` | Update hex values |
| `scripts/data/paints/vallejo.json` | Update hex values |
| `scripts/data/paints/green-stuff-world.json` | Update hex values |
| `scripts/data/paints/ak-interactive.json` | Update hex values |

### Step 3: Verify and improve hue assignment algorithm

After hex corrections, re-evaluate the hue assignment quality:

1. Run the seed generator to recompute all HSL values and hue assignments
2. Spot-check a sample of paints per hue group to verify assignments make sense
3. Identify systematic misclassifications (e.g., dark browns consistently landing in wrong hue group)
4. If needed, adjust:
   - `NEUTRAL_SATURATION_THRESHOLD` in `generate-seed.ts` (currently 15%)
   - `HUE_ANGLE_RANGES` boundaries for better Munsell hue family mapping
   - `COLOR_CATALOG` hex values for sub-hues to improve RGB distance matching

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/generate-seed.ts` | Potential tuning of thresholds and ranges |

### Step 4: Regenerate seed data and verify

1. Run `npm run db:seed:generate` to produce updated `supabase/seed.sql`
2. Run `npm run db:reset` to apply migration + seed
3. Visually verify a sample of paints in the UI (paint explorer, hue groups)
4. Run `npm run build` and `npm run lint`

#### Affected Files

| File | Changes |
|------|---------|
| `supabase/seed.sql` | Regenerated with corrected color data |

### Step 5: Document data quality decisions

Update documentation to capture:

- Which paints have estimated vs. sourced hex values
- How metallic/translucent paints were handled
- Any manual hue assignment overrides
- Known remaining data quality gaps

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/REFERENCES.md` | Updated with per-brand sourcing notes |

### Risks & Considerations

- **Volume of work** — 2,337 paints across 5 brands is a significant data verification effort. Prioritize by brand (Citadel and Vallejo are the most widely used) or by paint type (base/layer paints are most important for color accuracy).
- **Hex subjectivity** — Different reference sites may disagree on the "correct" hex for a paint. Photography lighting, monitor calibration, and paint opacity all affect perceived color. Document which source was used.
- **Translucent paints** — Shades, washes, contrast, and ink paints are translucent and don't have a single "correct" solid color. The hex value should represent the paint's appearance over a white or medium-grey primer — document this convention.
- **Metallic paints** — Metallic paints cannot be accurately represented by a single hex value. Use the dominant base color (ignoring the metallic sheen) for classification purposes.
- **Hue boundary edge cases** — Paints near the boundary between two Munsell hue families (e.g., a warm brown at the Red/Yellow-Red border) may flip between hue groups after hex correction. This is expected and acceptable.
- **Seed reproducibility** — The seed generator uses `randomUUID()` for paint IDs, so each regeneration produces new UUIDs. Any external references to paint UUIDs will break. This is acceptable pre-production.
- **Data freshness** — Paint ranges change over time (new paints released, old ones discontinued). This enhancement focuses on correcting existing data, not adding new paints.

## Notes

- The `findClosestColor()` function uses a two-step approach: first determine the principal hue family from HSL angle, then find the closest sub-hue by RGB distance within that family. Correcting hex values will improve both steps.
- The `ISCC-NBS` sub-hue hex codes in `COLOR_CATALOG` are synthetic representations. They're used as matching targets, not displayed to users. If tuning is needed, adjust these hex values rather than the algorithm itself.
- This enhancement is a prerequisite for accurate cross-brand comparison (Epic 4) and color scheme exploration (Epic 5), which depend on reliable color data.
