# Database Enhancements — Citadel Shades & Army Painter Speedpaint 2.0

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo
**Branch:** `feature/database-enhancements-washes-and-speedpaint`
**Merge into:** `main`

## Summary

Refresh and verify the Grimify paint data for two **translucent** product lines — **Citadel Shade** (Citadel's wash range) and **Army Painter Speedpaint 2.0** — using [armycrafter.com](https://armycrafter.com) as the primary reference source. Both lines are translucent (their stored `hex` is an estimate of the paint's pooled/over-white appearance, not a solid color), and the existing [Paint Database Data Improvement](./05-paint-database-data-improvement.md) doc explicitly flags shade/speedpaint hex values as estimated and in need of better sourcing.

This feature has two parts:

1. **Data refresh** — following the established data pipeline used by every brand line: edit the per-brand JSON files (`scripts/data/paints/*.json`), regenerate `supabase/seed.sql` via `scripts/generate-seed.ts`, and (for already-deployed databases) add an idempotent migration. The data portion needs **no schema change** — the `paints` schema already models these lines via the `paint_type` text column and the existing `Shade` / `Speedpaint` product lines.
2. **Gradient swatch rendering** — a UI change so paints whose flat hex doesn't represent their on-model appearance render as a CSS gradient instead of a solid fill. Applies to **translucent lines** (Shade, Wash, Ink, Contrast, Speedpaint, Xpress Color) and **metallic lines**.

### Gradient swatch behavior

Today every swatch is a solid fill (`style={{ backgroundColor: hex }}`). The new behavior:

- **Pooling translucent** (Shade / Wash / Ink / Contrast / Xpress Color) — a **vertical** gradient keeping the paint's hue & saturation, light at the top (thin film) down to the paint's true lightness at the bottom (where it pools):
  `linear-gradient(hsl(H, S%, L_top%), hsl(H, S%, L_bottom%))` — e.g. `linear-gradient(hsl(20.92, 50.70%, 63.24%), hsl(20.92, 50.70%, 21.08%))`
- **Speedpaint** — a **horizontal** (`90deg`) gradient from a ~10% tint (mostly white) to the full paint color, mimicking thin-to-pooled application:
  `linear-gradient(90deg, lerp(white, rgb, 0.1), rgb)` — e.g. `linear-gradient(90deg, rgb(94.65%, 95.61%, 96.02%), rgb(44.18%, 54.20%, 58.49%))`
- **Metallic** — a **diagonal** (`135deg`) sheen: a highlight stop, the base color, and a shadow stop, all sharing the paint's hue & saturation:
  `linear-gradient(135deg, hsl(H, S%, L+Δ%), hsl(H, S%, L%), hsl(H, S%, L−Δ%))`
- **Everything else** (opaque, non-metallic) — unchanged solid `backgroundColor: hex`.

Per the design decision for this feature, the gradient is **derived at render time** from data already stored (`hex` → H/S/L and R/G/B, plus `paint_type` and `is_metallic`). **No new database columns and no migration for styling** — a single shared helper computes the background and the swatch call-sites adopt it. "Add to the database" here means the styling is keyed off the seeded paints' `paint_type` / `is_metallic`, not that gradient values are stored.

### Current State (important — these lines already exist)

Both lines are **already seeded**. This feature corrects and completes them rather than adding them from scratch:

| Line | Currently seeded | armycrafter.com lists | Net-new entries |
|------|------------------|-----------------------|-----------------|
| Citadel **Shade** (`scripts/data/paints/citadel.json`, `type: "Shade"`) | **23** | ~19 colors enumerated (page count says 23; Gloss + Cryptek variants not enumerated) | **0** — the seed is already complete (it additionally carries `Agrax Earthshade Gloss`, `Nuln Oil Gloss`, `Reikland Fleshshade Gloss`, `Cryptek Armourshade Gloss`) |
| Army Painter **Speedpaint** (`scripts/data/paints/army-painter.json`, `type: "Speedpaint"`) | **89** | **90** (incl. `Speedpaint Medium`) | **1** — `Speedpaint Medium` (a colorless thinning medium) |

A name-level diff (current seed vs. the armycrafter Speedpaint 2.0 list) shows **all 89 colored Speedpaints already present** and **exactly one missing entry: `Speedpaint Medium`**. No seeded Speedpaint is absent from the current 2.0 range.

The brand metadata already supports both lines — `scripts/data/brands.json` lists `"Shade"` under Citadel and `"Speedpaint"` / `"Speedpaint Metallic"` under Army Painter — so **no `brands.json` change is required.**

Because the additive gap is tiny (one clear medium), the real value of this feature is **(1) hex/HSL accuracy** for these 112 translucent paints, **(2)** adding the one missing `Speedpaint Medium`, and **(3)** optionally tightening cross-brand `comparable` links between Citadel Shades and their Army Painter wash/speedpaint equivalents.

> **Source caveat:** armycrafter.com renders each paint as a color swatch but does **not** expose hex values or SKUs as page text (confirmed via fetch). Hex values must be sampled from the rendered swatches, or cross-referenced against PaintPad's Speedpaint 2.0 page (`https://paintpad.app/paints/the-army-painter-speedpaint-2-0`), which is already a documented source in `scripts/data/REFERENCES.md`. See Open Questions.

## Acceptance Criteria

- [ ] `Speedpaint Medium` is added to `scripts/data/paints/army-painter.json` (`type: "Speedpaint"`, next sequential id `ap-462`) with a documented hex convention for a colorless medium
- [ ] All 89 existing Army Painter Speedpaint hex values are verified/corrected against armycrafter.com (cross-checked with PaintPad Speedpaint 2.0), with any changes captured in `REFERENCES.md`
- [ ] All 23 Citadel Shade hex values are verified/corrected against armycrafter.com, with any changes captured in `REFERENCES.md`
- [ ] No invented hex values — every changed/added value is sampled from a swatch or a documented reference; clear-medium hex is explicitly noted as an approximation
- [ ] `scripts/data/REFERENCES.md` gains an armycrafter.com source row for the Citadel Shade and Army Painter Speedpaint 2.0 lines, with the re-sourced date
- [ ] `npm run db:seed:generate` runs without errors and the summary line shows Army Painter paint count incremented by 1 (462) and no unresolved-reference warnings
- [ ] `npm run db:reset` applies cleanly with no SQL errors
- [ ] An idempotent migration brings an already-deployed database to the same state (new `Speedpaint Medium` row + corrected hex/HSL for the refreshed paints)
- [ ] `Speedpaint Medium` appears on the Army Painter Speedpaint product line and is searchable; refreshed swatches render with corrected colors in the paint explorer and on the color wheel
- [ ] A shared helper (e.g. `src/modules/paints/utils/paint-swatch-background.ts`) returns the correct CSS background for a paint given its `hex`, `paintType`, and `isMetallic` — gradient for translucent/metallic lines, solid hex otherwise — and is unit-test-free per project convention but verified by spot-checking output
- [ ] Pooling translucent paints (Shade, Wash, Ink, Contrast, Xpress Color) render a vertical gradient; Speedpaints render a horizontal tint gradient; metallics render a diagonal sheen; all opaque non-metallic paints render unchanged solid swatches
- [ ] Paint-backed swatch call-sites (paint card, paint detail, combobox, comparison, color-wheel detail panel, etc.) use the shared helper; hue/non-paint swatches remain solid
- [ ] Gradients derive from existing data only (no new DB columns, no styling migration); a paint with no hue (e.g. near-neutral `Speedpaint Medium`) still renders sensibly
- [ ] `npm run build` and `npm run lint` pass with no errors

## Open Questions / Prerequisites

Resolve these before writing any seed JSON. **Do not invent paint data to unblock implementation.**

1. **Hex extraction method.** armycrafter.com does not list hex as text. Decide the sampling approach:
   - **Primary:** sample the on-page swatch color for each paint (browser color picker / inspect the swatch element's computed background).
   - **Cross-check:** PaintPad's Speedpaint 2.0 page is already documented in `REFERENCES.md` and lists per-paint swatches; use it to corroborate Speedpaint hexes. For Citadel Shades, cross-check against PaintPad's Citadel Painting System page (`https://paintpad.app/paints/citadel-painting-system`, 100% covered per `REFERENCES.md`).
   - Record the chosen source per line in `REFERENCES.md`.
2. **Translucent hex convention.** Shades, washes, and speedpaints have no single solid color. The existing convention (documented in `REFERENCES.md` and the data-improvement doc) is "appearance over white/medium primer, taken from the solid swatch." Keep this consistent — do not switch conventions mid-line.
3. **`Speedpaint Medium` hex.** A colorless medium has no meaningful color. Decide: near-neutral low-saturation placeholder (e.g. an off-white) and document it as a deliberate approximation, mirroring how clear mediums are discussed in [Army Painter Effects](./army-painter-effects.md). It will plot near neutral on the color wheel — acceptable.
4. **Scope of `comparable` links.** Citadel Shade ↔ Army Painter equivalents already partially exist (e.g. `Agrax Earthshade` → `Strong Tone`). Decide whether expanding/auditing these is in scope here or deferred to [Paint Database Data Improvement](./05-paint-database-data-improvement.md). **Recommendation:** keep `comparable` edits minimal/optional in this feature; the data-improvement doc owns cross-reference work.
5. **Deployed-DB strategy.** `generate-seed.ts` mints fresh `randomUUID()` paint IDs on every run, so a full `db:reset` reseed is fine locally but changes UUIDs (see Risks). For an already-deployed DB, the migration must **UPDATE** existing rows' hex/HSL (not just `INSERT ... ON CONFLICT DO NOTHING`, which silently skips existing paints) and **INSERT** only the new `Speedpaint Medium`. Confirm whether `npm run db:paints:recalculate` (which re-derives color from hex on a live DB) is the preferred path for the hex corrections instead of hand-written `UPDATE`s.
6. **Gradient lightness rules (finalize during implement).** The exact stop math, calibrated against the user-supplied examples:
   - **Pooling (vertical):** bottom stop = paint's own L; top stop = lerp L toward 100% by ≈`0.53` (i.e. `L_top = L + (100 − L) × 0.53`). Verified against the example: `L=21.08 → 21.08 + 78.92×0.53 ≈ 62.9 ≈ 63.24`. Confirm/tune the factor.
   - **Speedpaint (horizontal):** light stop = `lerp(white, rgb, 0.10)` (10% paint, 90% white); dark stop = full `rgb`. Verified against the example (`#718A95`-ish): `0.9×255 + 0.1×channel` reproduces `rgb(94.65%, 95.61%, 96.02%)`.
   - **Metallic (diagonal):** `Δ` for highlight/shadow stops (proposed `+25` / `−18` lightness points, clamped to `[0,100]`). No example was supplied — pick sensible defaults and eyeball a few metallics.
7. **Type precedence for combined lines.** Some types are both metallic and translucent (e.g. `Speedpaint Metallic`, `Warpaints Wash`). Define a single precedence order in the helper — recommended: **Speedpaint family → horizontal**, else **`is_metallic` → diagonal sheen**, else **pooling translucent type → vertical**, else **solid**. Confirm before coding.
8. **Translucent type set.** The helper must recognize the full translucent type set across brands. From `brands.json`: Citadel `Shade`, `Contrast`, `Technical` (some), Army Painter `*Wash`, `Speedpaint*`, plus Vallejo/Citadel inks and Citadel `Contrast`, GW `Xpress`-equivalents. Enumerate the exact `paint_type` strings to match (case-insensitive substring vs. exact list) during implement; prefer an explicit allow-list keyed to real `type` values in the JSON.

## Implementation Plan

Phased so each phase is self-contained and ends with a regenerated, verified seed. Phases 0–1 are prerequisite data work with no code; the rest follow the existing pipeline.

### Phase 0 — Source & reconcile the data (prerequisite, no code)

1. Pull the full Citadel Shade and Army Painter Speedpaint 2.0 lists from armycrafter.com (`/paints/citadel/shade`, `/paints/army-painter/speedpaint-2-0`).
2. For each paint, sample the swatch hex and cross-check against PaintPad (per Open Question 1). Build a working table: `name · current seeded hex · sourced hex · changed?`.
3. Confirm the only net-new entry is `Speedpaint Medium`; confirm no seeded paint should be removed (none flagged as discontinued in the 2.0 range — but verify).
4. Do not proceed until the table is complete and reviewed.

### Phase 1 — Update the JSON data files

1. **`scripts/data/paints/army-painter.json`**
   - Correct `hex` for the 89 existing Speedpaint entries where Phase 0 found a better value (leave `name`, `id`, `type`, `description`, `comparable` untouched unless a name is wrong).
   - Append the missing entry following the existing `PaintJson` shape:
     ```json
     {
       "id": "ap-462",
       "name": "Speedpaint Medium",
       "hex": "#F2EFE9",
       "type": "Speedpaint",
       "description": "Colorless thinning/transparency medium — hex is a near-neutral approximation",
       "comparable": []
     }
     ```
     (`id` `ap-462` is the next sequential after the current max `ap-461`; final hex per Open Question 3.)
2. **`scripts/data/paints/citadel.json`**
   - Correct `hex` for the 23 `type: "Shade"` entries where Phase 0 found a better value. No additions expected.
3. Keep entries in the file's existing ordering; do not renumber existing IDs.

### Phase 2 — Regenerate the seed and verify locally

1. `npm run db:seed:generate` — rebuilds `supabase/seed.sql`.
   - `generate-seed.ts` needs **no code change**: product lines are auto-derived from `type` strings (`Shade`, `Speedpaint` already exist), `is_metallic` detection is unaffected (neither line contains "metal"), and hue assignment runs via `findClosestColor()` / the PaintPad override map.
   - Confirm the summary log shows Army Painter at **462** paints (was 461) and no "unresolved paint reference" warnings.
2. `npm run db:reset` — must apply cleanly with no SQL errors.
3. `npm run db:types` — regenerate `src/types/supabase.ts` (no shape change expected; run for parity).

### Phase 3 — Idempotent migration for deployed databases

Net-new paints in this repo are also shipped as a migration (precedent: `supabase/migrations/20260529000001_add_scale75_paints.sql`). Because this feature is mostly **hex corrections to existing rows** plus **one new row**, the migration must do both:

1. Create `supabase/migrations/20260628000000_refresh_shade_speedpaint_data.sql`.
2. **INSERT** `Speedpaint Medium` using the subquery-by-slug pattern from the Scale75 migration (look up `product_line_id` via brand+line slug, look up `hue_id` via the hues table), with `ON CONFLICT (product_line_id, slug) DO NOTHING`.
3. **UPDATE** the corrected hex (and recompute `r/g/b`, `hue/saturation/lightness`, `hue_id`) for each changed Shade/Speedpaint row, keyed by `brand_paint_id` (stable across reseeds, unlike `id`). Alternatively, document that `npm run db:paints:recalculate` is run post-deploy to re-derive color from the corrected hex — pick one path per Open Question 5 and note it in the migration header.
4. Keep the migration idempotent and re-runnable.

### Phase 4 — Update references & verify in the app

1. **`scripts/data/REFERENCES.md`** — add armycrafter.com source rows for Citadel Shade and Army Painter Speedpaint 2.0, note the re-sourced date, and update any coverage figures. Keep the translucent/medium hex-convention note current.
2. Verify in the app:
   - `/brands/army-painter` → Speedpaint line shows the new `Speedpaint Medium` and the expected count.
   - Open a few refreshed Shade/Speedpaint paints → swatch, hex, and hue assignment look correct.
   - Search for `Speedpaint Medium` (navbar paint search) → returns a result.
   - Color wheel → refreshed paints sit at their recomputed hue/lightness; the clear medium clusters near neutral.
3. `npm run build` and `npm run lint`.

### Phase 5 — Gradient swatch rendering (UI, derive-at-render)

No schema or seed dependency — this phase can proceed in parallel with the data phases.

1. **Create the shared helper** `src/modules/paints/utils/paint-swatch-background.ts`:
   - Signature: `paintSwatchBackground({ hex, paintType, isMetallic }): CSSProperties` (returns `{ background }` for gradients or `{ backgroundColor }` for solids), or a plain CSS string — match whatever the call-sites consume most cleanly.
   - Derive `H/S/L` and `R/G/B` from `hex` internally (reuse any existing hex↔HSL/RGB util in `src/lib` or `src/modules/paints/utils`; check before adding a new converter). This keeps call-sites passing only `hex` + `paintType` + `isMetallic`.
   - Branch by the precedence from Open Question 7; produce the gradient strings from Open Questions 6/8.
   - Full JSDoc per project convention (`@param`, `@returns`, `@remarks` for the gradient rules).
2. **Adopt the helper at paint-backed swatch call-sites.** Replace `style={{ backgroundColor: paint.hex }}` with the helper output where the swatch represents a paint and `paintType` (+ `isMetallic`) are available or threadable:
   - `src/modules/paints/components/paint-card.tsx` (add `isMetallic` prop alongside existing `paintType`)
   - `src/modules/paints/components/paint-detail.tsx`
   - `src/modules/paints/components/paint-combobox.tsx`
   - `src/modules/paints/components/paint-comparison-card.tsx`
   - `src/modules/paints/components/paint-comparison-delta-matrix.tsx`
   - `src/modules/paints/components/discontinued-paint-listing.tsx`
   - `src/modules/color-wheel/components/paint-detail-panel.tsx`
   - Collection/palette/recipe/scheme paint swatches where `paint_type` is reachable (`collection-paint-card`, `palette-paint-row`, `palette-swap-*`, `recipe-step-paint-*`, `scheme-paint-combobox`, `scheme-partner-row`) — adopt where the paint object carries `paint_type`/`is_metallic`; otherwise leave solid and note it.
   - **Do not** change hue/non-paint swatches (`hue.hex_code`, `group.hex`, base-color-picker, scheme-swatch for arbitrary colors) — those stay solid.
3. Confirm the queries feeding these components already select `paint_type` and `is_metallic`; if a component's data shape omits them, extend the select/type (services in `src/modules/paints/services/`) rather than refetching.
4. Verify visually: a Shade (vertical), a Speedpaint (horizontal tint), a metallic (diagonal sheen), and an opaque Base/Layer (solid) all render correctly in the paint explorer, paint detail, and color-wheel panel.

### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/paints/army-painter.json` | Correct hex for 89 Speedpaints; append `ap-462` Speedpaint Medium |
| `scripts/data/paints/citadel.json` | Correct hex for 23 Shade entries |
| `scripts/data/REFERENCES.md` | Add armycrafter.com source rows + re-sourced date for both lines |
| `supabase/seed.sql` | Regenerated by `npm run db:seed:generate` (new paint + corrected color data) |
| `supabase/migrations/20260628000000_refresh_shade_speedpaint_data.sql` | New — idempotent INSERT (Speedpaint Medium) + UPDATE (hex/HSL corrections) for deployed DBs |
| `src/types/supabase.ts` | Regenerated for parity (no shape change expected) |
| `src/modules/paints/utils/paint-swatch-background.ts` | **New** — shared helper computing solid vs. gradient CSS background from `hex` + `paintType` + `isMetallic` |
| `src/modules/paints/components/{paint-card,paint-detail,paint-combobox,paint-comparison-card,paint-comparison-delta-matrix,discontinued-paint-listing}.tsx` | Use the helper for paint swatches; `paint-card` gains an `isMetallic` prop |
| `src/modules/color-wheel/components/paint-detail-panel.tsx` | Use the helper for the paint swatch |
| `src/modules/{collection,palettes,recipes,color-schemes}/components/*` (paint swatches only) | Adopt the helper where `paint_type`/`is_metallic` are available; otherwise unchanged |
| `src/modules/paints/services/*` (if needed) | Extend selects/types to include `paint_type` / `is_metallic` for any swatch component missing them |
| `brands.json`, schema/migrations for styling | **No change** — gradients derive at render; no styling columns or migration |

### Risks & Considerations

- **The lines already exist.** This is a refresh, not a net-new brand line. The framing ("add Citadel shades and AP speedpaints") overstates the gap — only `Speedpaint Medium` is genuinely missing. If the real intent was something else (e.g. a schema-level translucent/finish classification, or de-emphasizing translucent paints in color matching), redirect before implementing — that is a different feature (see the schema-extension follow-up noted in [Army Painter Effects](./army-painter-effects.md)).
- **Hex not scrapable from armycrafter.** Hex must be sampled from swatches or cross-referenced via PaintPad; budget time for manual sampling of ~112 paints. Document the per-paint source where it differs from PaintPad.
- **Reseed churns UUIDs.** `generate-seed.ts` mints fresh `randomUUID()` paint IDs each run, so a full `db:reset` reseed changes all paint UUIDs and breaks external references. Use the migration's keyed `UPDATE`s (or `db:paints:recalculate`) for a live DB rather than reseeding it. (Same caveat called out in the data-improvement doc.)
- **`ON CONFLICT DO NOTHING` will not correct existing rows.** A copy of the Scale75 INSERT-only pattern would silently skip every already-seeded Shade/Speedpaint. The migration must explicitly `UPDATE` for hex corrections.
- **Translucent hex is inherently approximate.** Shades/washes/speedpaints have no single true color; keep the documented "over white/medium primer" convention. The clear `Speedpaint Medium` is a deliberate near-neutral placeholder.
- **Type-string exactness.** New/edited entries must use `type: "Speedpaint"` / `type: "Shade"` exactly (matching `brands.json`), or the generator silently fails to associate them with a product line. Spot-check the generator output.
- **Hue re-classification.** Corrected hex may move a paint across a Munsell hue boundary (its `hue_id` recomputes). This is expected and acceptable.
- **Swatch call-sites are numerous (~40).** Gradients only matter where the swatch represents a *paint* and `paint_type`/`is_metallic` are available. Scope Phase 5 to those; leave hue swatches and arbitrary-color pickers solid. Audit each call-site's data shape before editing — some may need a `select`/type extension to carry the type fields.
- **Gradient must degrade gracefully.** Near-neutral paints (e.g. `Speedpaint Medium`) and very dark/light paints must still produce a legible swatch — clamp lightness stops to `[0,100]` and confirm contrast against the card border.
- **Consistency vs. existing UI.** Introducing gradients changes the visual language site-wide for affected lines. Keep the swatch dimensions/border identical; only the fill changes. Verify dark mode renders the gradients acceptably.
- **No tests in this project.** Per `## Testing`, there's no framework; the helper's correctness is verified by spot-checking output against the two reference examples rather than unit tests.

## Notes

- This feature complements [Paint Database Data Improvement](./05-paint-database-data-improvement.md), which owns the broad multi-brand hex/hue sourcing pipeline; this doc is a focused, reviewable slice for two translucent lines with a specific new source (armycrafter.com).
- Citadel "Shade" is Citadel's branding for what other brands call a wash — hence the branch name "washes and speedpaint."
- A potential follow-up (out of scope): a first-class `finish` / `is_translucent` schema column so washes, speedpaints, contrast, and inks can be filtered and handled distinctly in color matching and on the wheel. File separately if pursued.
