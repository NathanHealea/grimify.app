# Paint Database Data Improvement

**Epic:** Paint Data & Search
**Type:** Enhancement
**Status:** In Progress
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

> This is ongoing data-quality work, not a one-shot code feature. The pipeline that
> sources and applies color data is built and the bulk of the original 5-brand
> corpus is corrected. What remains is (a) extending the pipeline to brands and
> paints added since the first pass, (b) closing known coverage gaps, and (c) the
> one unaddressed data dimension — discontinued status. Phases below are ordered so
> each is self-contained and ends with a regenerated, verified seed.

### Data pipeline (built — reference)

The end-to-end mechanism is implemented and reproducible from npm scripts:

| Stage | Mechanism | Artifact |
|-------|-----------|----------|
| Source paint hex per brand | PaintPad.app brand pages parsed, hex written back into JSON | `scripts/data/paints/*.json` |
| Source ISCC-NBS sub-hue per paint | `scripts/fetch-paintpad-hues.ts` parses 29 by-colour pages | `scripts/data/paintpad-hue-assignments.json` |
| Resolve paint → sub-hue overrides | `scripts/apply-paintpad-hue-overrides.ts` matches by brand+name, resolves multi-page conflicts by hex distance | `scripts/data/hue-overrides.json`, `scripts/data/paintpad-section-colors.json` |
| Generate seed | `npm run db:seed:generate` (`scripts/generate-seed.ts`) computes `r/g/b`, `hue/saturation/lightness`, derives `is_metallic` from type, applies hue overrides (else `findClosestColor()`) | `supabase/seed.sql` |
| Recompute live DB in place | `npm run db:paints:recalculate` (`--dry` to preview) re-derives color + `hue_id` for an already-seeded DB | `public.paints` rows |
| Sourcing record | manually maintained | `scripts/data/REFERENCES.md` |

### Already done (original 5-brand pass)

- Hex sourced from PaintPad for Citadel (100%), Army Painter (99.8%), Vallejo (94%), AK Interactive (94%), Green Stuff World (75%) — overall ~95% of the original corpus.
- `r/g/b` and `hue/saturation/lightness` recomputed from corrected hex in the generator (`hexToRgb` → `rgbToHsl`, rounded to 2dp).
- Sub-hue (`hue_id`) sourced from PaintPad's ISCC-NBS by-colour pages; 2,193 paints in the original pass use PaintPad overrides, remainder fall back to `findClosestColor()`.
- `COLOR_CATALOG` ISCC-NBS centroid hexes updated from PaintPad section swatches (99/121 sub-hues).
- `is_metallic` derived from the paint type string in `generate-seed.ts`.
- Metallic and translucent (wash/ink/contrast/speedpaint) hex conventions documented in `REFERENCES.md`.
- Seed generator produces `supabase/seed.sql`; `npm run build` and `npm run lint` pass.

### Known gaps in current data (drives remaining work)

1. **Scale75 is uncovered by the hue-override pipeline.** The brand was added after the
   first pass — it is in `brands.json`, has `scripts/data/paints/scale75.json`, and is
   seeded — but it is **absent from `PAINTPAD_BRAND_MAP` and the `brandFiles` map in
   `apply-paintpad-hue-overrides.ts`**, absent from `REFERENCES.md`, and its
   `brand_paint_id`s are not in `hue-overrides.json`. All ~548 Scale75 paints therefore
   fall back to algorithmic `findClosestColor()` hue assignment, and their hex values are
   unverified against any documented source.
2. **Corpus grew beyond the documented 2,337.** The seed now contains **6 brands / 2,885 paints**
   (Citadel 508, Army Painter 568, Vallejo 823, AK 650, GSW 122, Scale75 548). The paints added
   since the original sourcing pass have not been re-run through hex verification, so
   `REFERENCES.md` coverage figures are stale.
3. **`is_discontinued` is unpopulated.** `generate-seed.ts` hardcodes `is_discontinued = false`
   for every paint; the column and the discontinued UI (`discontinued-badge.tsx`,
   `discontinued-service*.ts`) exist but no paint is ever flagged. This data dimension has
   no source yet.
4. **Residual unmatched paints from the original brands** (~118): Abteilung 502 oils (AK, 38),
   Vallejo Game Color Ink/Wash naming mismatches (~12), newer Vallejo Xpress (~17+), newer GSW
   acrylics (~31) — all retain original/estimated hex and algorithmic hue.

### Phase 1 — Bring Scale75 into the hue-override pipeline

Mechanism: data sourcing + override script. Self-contained; ends with regenerated seed.

1. Verify `scripts/data/paints/scale75.json` hex values against a documented source (PaintPad Scale75 pages where listed, else manufacturer charts); fix `#RRGGBB` uppercase consistency.
2. Add Scale75's PaintPad brand-page slugs to the `COLOUR_SLUGS`/brand coverage in `fetch-paintpad-hues.ts` if not already captured, and re-fetch so Scale75 paints appear in `paintpad-hue-assignments.json` with brand attribution.
3. Add Scale75 entries to `PAINTPAD_BRAND_MAP` and `brandFiles` in `apply-paintpad-hue-overrides.ts`, then regenerate `hue-overrides.json`.
4. Regenerate seed and verify Scale75 paints now carry PaintPad sub-hue overrides instead of pure algorithmic assignment.

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/paints/scale75.json` | Verify/correct hex values |
| `scripts/apply-paintpad-hue-overrides.ts` | Add Scale75 to `PAINTPAD_BRAND_MAP` and `brandFiles` |
| `scripts/fetch-paintpad-hues.ts` | Ensure Scale75 brand attribution is captured |
| `scripts/data/hue-overrides.json` | Regenerated to include Scale75 |
| `scripts/data/REFERENCES.md` | Add Scale75 section + per-line sources |

### Phase 2 — Re-verify paints added since the original pass

Mechanism: data audit + JSON hex updates. Reconciles the corpus against current source data.

1. Diff the current per-brand paint counts against the figures recorded in `REFERENCES.md` (now 6 brands / 2,885 paints) to identify paints added after the first sourcing run.
2. Re-run hex sourcing for the brands whose counts grew (Citadel, Army Painter, Vallejo) and write corrected hex back into the JSON files.
3. Re-run `fetch-paintpad-hues.ts` + `apply-paintpad-hue-overrides.ts` so the new paints get sub-hue overrides.
4. Update `REFERENCES.md` coverage tables to the new totals and re-record the "data sourced" date.

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/paints/*.json` | Hex updates for newly added paints |
| `scripts/data/paintpad-hue-assignments.json` | Re-fetched |
| `scripts/data/hue-overrides.json` | Regenerated |
| `scripts/data/REFERENCES.md` | Updated coverage tables + date |

### Phase 3 — Populate the discontinued dimension

Mechanism: new data source + generator change. The only data dimension with no current source.

1. Establish a discontinued-status source per brand (manufacturer "discontinued" listings, community trackers, or a manually curated `scripts/data/discontinued.json` keyed by brand `id` + paint `id`).
2. Load that source in `generate-seed.ts` and replace the hardcoded `false` with the looked-up value when emitting the `is_discontinued` column.
3. Mirror the same lookup in `recalculate-paint-colors.ts` if discontinued status should be patchable on a live DB without a full reset.
4. Regenerate seed; verify the discontinued badge/listing UI now renders flagged paints.

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/discontinued.json` | New — curated discontinued status per paint |
| `scripts/generate-seed.ts` | Source `is_discontinued` from the new file instead of hardcoding `false` |
| `scripts/recalculate-paint-colors.ts` | Optionally apply discontinued status to a live DB |

### Phase 4 — Close residual coverage gaps & tune edge cases

Mechanism: targeted JSON corrections + algorithm/catalog tuning.

1. Resolve the documented unmatched paints: Abteilung 502 oils, Vallejo Game Color Ink/Wash name mismatches, newer Vallejo Xpress, newer GSW acrylics — either by adding name aliases for matching or sourcing hex manually and documenting the decision.
2. Spot-check hue distribution per family; for any systematic misclassification, tune `findClosestColor()` thresholds (e.g. neutral-saturation cutoff) or the remaining 22 synthetic `COLOR_CATALOG` sub-hue hexes rather than the algorithm shape.
3. Update `REFERENCES.md` "Known Remaining Gaps" to reflect what is now resolved vs. outstanding.

#### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/paints/*.json` | Hex/alias corrections for residual unmatched paints |
| `scripts/generate-seed.ts` / color-wheel catalog | Threshold / synthetic-hex tuning if needed |
| `scripts/data/REFERENCES.md` | Updated gap list |

### Phase 5 — Regenerate, verify, and confirm clean reset

Mechanism: build/verify pass. Run after any of the above phases.

1. `npm run db:seed:generate` to rebuild `supabase/seed.sql`.
2. `npm run db:reset` — **must apply cleanly with no errors** (the one outstanding acceptance criterion).
3. Spot-check paints in the UI (paint explorer, hue groups, discontinued listing, cross-brand compare).
4. `npm run build` and `npm run lint`.
5. Optionally `npm run db:paints:recalculate -- --dry` against a running DB to confirm the live data matches the generator's output.

#### Affected Files

| File | Changes |
|------|---------|
| `supabase/seed.sql` | Regenerated |

### Risks & Considerations

- **Reproducibility vs. live DB drift** — `generate-seed.ts` mints fresh `randomUUID()` paint IDs on every run, so a full `db:reset` reseed changes all paint UUIDs and breaks any external references; `db:paints:recalculate` exists to patch color/hue on a live DB in place without that churn. Choose the right tool per phase (Phases 1–2/4 → reseed; Phase 3 discontinued-only → recalculate path).
- **Volume of work** — ~2,885 paints across 6 brands. Prioritize by brand usage (Citadel, Vallejo) and by paint type (base/layer over technical) where verification time is limited.
- **Hex subjectivity** — Reference sites disagree on a paint's "correct" hex; lighting, calibration, and opacity all shift perceived color. Always record the source used in `REFERENCES.md`.
- **Translucent paints** — Shades, washes, contrast, inks, and speedpaints have no single solid color; the convention (appearance over white/medium primer, taken from the PaintPad solid swatch) is documented and should be kept consistent for new entries.
- **Metallic paints** — Represented by the dominant base tone (PaintPad's gradient `color:` value), with the sheen ignored for classification. `is_metallic` is derived from the type string, so new metallic product lines must use a type name containing "metal".
- **Discontinued source reliability** — Manufacturers rarely publish authoritative discontinued lists; a curated file will be best-effort and needs periodic review as ranges change.
- **Hue boundary edge cases** — Paints near a Munsell family boundary may flip groups after hex correction; this is expected and acceptable.
- **Data freshness** — Paint ranges evolve (new releases, discontinuations). This enhancement maintains and corrects existing data; net-new range additions follow the same pipeline.

## Notes

- The `findClosestColor()` function uses a two-step approach: first determine the principal hue family from HSL angle, then find the closest sub-hue by RGB distance within that family. Correcting hex values will improve both steps.
- The `ISCC-NBS` sub-hue hex codes in `COLOR_CATALOG` are synthetic representations. They're used as matching targets, not displayed to users. If tuning is needed, adjust these hex values rather than the algorithm itself.
- This enhancement is a prerequisite for accurate cross-brand comparison (Epic 4) and color scheme exploration (Epic 5), which depend on reliable color data.
