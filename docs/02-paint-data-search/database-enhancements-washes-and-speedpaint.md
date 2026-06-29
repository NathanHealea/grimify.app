# Database Enhancements — Citadel Shades & Army Painter Speedpaint 2.0

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo
**Branch:** `feature/database-enhancements-washes-and-speedpaint`
**Merge into:** `main`

## Summary

Refresh and verify the Grimify paint data for two **translucent** product lines — **Citadel Shade** (Citadel's wash range) and **Army Painter Speedpaint 2.0** — using [armycrafter.com](https://armycrafter.com) as the primary reference source. Both lines are translucent (their stored `hex` is an estimate of the paint's pooled/over-white appearance, not a solid color), and the existing [Paint Database Data Improvement](./05-paint-database-data-improvement.md) doc explicitly flags shade/speedpaint hex values as estimated and in need of better sourcing.

This is a **data-quality refresh + reconciliation** following the established data pipeline used by every brand line: edit the per-brand JSON files (`scripts/data/paints/*.json`), regenerate `supabase/seed.sql` via `scripts/generate-seed.ts`, and (for already-deployed databases) add an idempotent migration. **No application-code or schema changes are expected** — the `paints` schema already models these lines via the `paint_type` text column and the existing `Shade` / `Speedpaint` product lines.

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

### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/paints/army-painter.json` | Correct hex for 89 Speedpaints; append `ap-462` Speedpaint Medium |
| `scripts/data/paints/citadel.json` | Correct hex for 23 Shade entries |
| `scripts/data/REFERENCES.md` | Add armycrafter.com source rows + re-sourced date for both lines |
| `supabase/seed.sql` | Regenerated by `npm run db:seed:generate` (new paint + corrected color data) |
| `supabase/migrations/20260628000000_refresh_shade_speedpaint_data.sql` | New — idempotent INSERT (Speedpaint Medium) + UPDATE (hex/HSL corrections) for deployed DBs |
| `src/types/supabase.ts` | Regenerated for parity (no shape change expected) |
| _(none expected)_ | No `src/` app code or `brands.json` changes — schema and services already handle these `paint_type` strings and product lines |

### Risks & Considerations

- **The lines already exist.** This is a refresh, not a net-new brand line. The framing ("add Citadel shades and AP speedpaints") overstates the gap — only `Speedpaint Medium` is genuinely missing. If the real intent was something else (e.g. a schema-level translucent/finish classification, or de-emphasizing translucent paints in color matching), redirect before implementing — that is a different feature (see the schema-extension follow-up noted in [Army Painter Effects](./army-painter-effects.md)).
- **Hex not scrapable from armycrafter.** Hex must be sampled from swatches or cross-referenced via PaintPad; budget time for manual sampling of ~112 paints. Document the per-paint source where it differs from PaintPad.
- **Reseed churns UUIDs.** `generate-seed.ts` mints fresh `randomUUID()` paint IDs each run, so a full `db:reset` reseed changes all paint UUIDs and breaks external references. Use the migration's keyed `UPDATE`s (or `db:paints:recalculate`) for a live DB rather than reseeding it. (Same caveat called out in the data-improvement doc.)
- **`ON CONFLICT DO NOTHING` will not correct existing rows.** A copy of the Scale75 INSERT-only pattern would silently skip every already-seeded Shade/Speedpaint. The migration must explicitly `UPDATE` for hex corrections.
- **Translucent hex is inherently approximate.** Shades/washes/speedpaints have no single true color; keep the documented "over white/medium primer" convention. The clear `Speedpaint Medium` is a deliberate near-neutral placeholder.
- **Type-string exactness.** New/edited entries must use `type: "Speedpaint"` / `type: "Shade"` exactly (matching `brands.json`), or the generator silently fails to associate them with a product line. Spot-check the generator output.
- **Hue re-classification.** Corrected hex may move a paint across a Munsell hue boundary (its `hue_id` recomputes). This is expected and acceptable.

## Notes

- This feature complements [Paint Database Data Improvement](./05-paint-database-data-improvement.md), which owns the broad multi-brand hex/hue sourcing pipeline; this doc is a focused, reviewable slice for two translucent lines with a specific new source (armycrafter.com).
- Citadel "Shade" is Citadel's branding for what other brands call a wash — hence the branch name "washes and speedpaint."
- A potential follow-up (out of scope): a first-class `finish` / `is_translucent` schema column so washes, speedpaints, contrast, and inks can be filtered and handled distinctly in color matching and on the wheel. File separately if pursued.
