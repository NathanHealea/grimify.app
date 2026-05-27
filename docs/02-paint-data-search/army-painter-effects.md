# Army Painter Effects Paint Line

**Epic:** Paint Data & Search
**Type:** Enhancement
**Status:** Todo
**Branch:** `data/army-painter-effects-paints`
**Merge into:** `main`

## Summary

Add Army Painter's "Effects" paint line to the Grimify paint database. Effects is a specialty range of texture and finish paints (e.g. crackle medium, glaze, varnishes, weathering effects) sold by Army Painter that is currently absent from the seed data — the existing Army Painter entry in `scripts/data/brands.json` only covers the Fanatic, Warpaints, Speedpaint, and Masterclass lines.

This is a **content/data gap** report, not a feature. The work follows the same data pipeline used by every existing brand line: a per-brand JSON file feeds `scripts/generate-seed.ts`, which regenerates `supabase/seed.sql`. No application-code changes are expected unless the schema cannot represent an Effects-specific attribute (see the Open Questions section).

### Why this is missing

`scripts/data/brands.json` lists the Army Painter brand with these `types`:

```
"Fanatic", "Fanatic Metallic", "Fanatic Wash",
"Masterclass",
"Speedpaint", "Speedpaint Metallic",
"Warpaints", "Warpaints Air", "Warpaints Metallic", "Warpaints Wash"
```

There is no `Effects` (or equivalent) type, and a `grep` over `scripts/data/paints/army-painter.json` confirms no paints carry an Effects-style `type` value. The line therefore never reaches `supabase/seed.sql`, and never surfaces in the app.

## Acceptance Criteria

- [ ] Army Painter's `types` array in `scripts/data/brands.json` includes `Effects` (final string TBD — see Open Questions)
- [ ] `scripts/data/paints/army-painter.json` contains all paints in the Effects line with accurate `id`, `name`, `hex`, and `type` values
- [ ] All hex values are sourced from Army Painter's official product pages or paintpad.app — no placeholder/invented values
- [ ] `npm run db:seed:generate` runs without errors and the summary line shows the expected new paint count
- [ ] `npm run db:reset` applies cleanly with no SQL errors
- [ ] Effects paints appear on the Army Painter brand page under a new "Effects" product line and are searchable
- [ ] `npm run build` and `npm run lint` pass with no errors

## Open Questions / Prerequisites

These must be resolved before any seed JSON is written. **Do not invent paint data to unblock the implementation step.**

1. **Source-of-truth paint list.** The full SKU list, product names, and brand paint codes for the Effects line need to be pulled from Army Painter's official catalog (`https://thearmypainter.com`) and cross-referenced with paintpad.app where available. Capture: official product name, product code, hex value, finish/effect description.
2. **Exact type-string naming.** Confirm whether Army Painter markets the range as a single line called "Effects" or multiple sub-lines (e.g. "Effects", "Effects Wash", "Effects Metallic"). The seed generator derives product lines from unique `type` strings, so any sub-line split must be modeled with a distinct `type` value. The Scale75 precedent (12 type strings, one per sub-line) shows this is the expected pattern.
3. **Effects-specific attributes the schema may not model.** Some Effects products (crackle medium, glaze medium, varnish, texture paste) are not pigmented paints. Audit the current schema (`paints` table in `docs/02-paint-data-search/00-paint-data-model.md`) for:
   - Whether `hex` is meaningful for clear/transparent products (mediums, varnishes). Decide: skip the product, use a "neutral" hex placeholder (`#FFFFFF` with low saturation), or flag for future schema extension.
   - Whether a new `is_effect` / `is_medium` / `finish` column would be useful. **Out of scope for this doc** — file as a follow-up if needed.
4. **Discontinued / repackaged products.** Some legacy Army Painter Effects products may have been folded into the Fanatic relaunch. Verify each entry is currently sold before adding it; flag any discontinued items with `is_discontinued` follow-up (handled by the generator if surfaced).
5. **Brand paint ID convention.** Existing Army Painter paints use sequential numeric IDs (`ap-1`, `ap-2`, …, up to ~461). Decide whether new Effects entries continue that sequence or use a code-based pattern (e.g. `ap-fx-01`). Recommendation: use a code-based prefix (`ap-fx-NN`) to keep the line visually distinguishable in the data file and avoid renumbering existing entries.

## Implementation Plan

### Step 1: Resolve open questions (prerequisite — no code yet)

Compile a working spreadsheet (or scratch markdown) covering every paint in the Effects line, sourced from Army Painter's product pages and paintpad.app. For each row, record:

- Official product name (exact casing as Army Painter ships it)
- Brand paint code (proposed `ap-fx-NN`)
- Hex value (verified against the product page swatch)
- Effects sub-line, if applicable (e.g. `Effects`, `Effects Wash`)
- Notes (e.g. "clear medium — hex is approximate", "metallic finish")

Do not proceed past this step until the list is complete and reviewed.

### Step 2: Update `scripts/data/brands.json`

Append the new type string(s) to the Army Painter `types` array. Example (single-line approach, pending Step 1 confirmation):

```json
{
  "id": "army-painter",
  "name": "Army Painter",
  "icon": "🛡️",
  "color": "#D32F2F",
  "types": [
    "Effects",
    "Fanatic",
    "Fanatic Metallic",
    "Fanatic Wash",
    "Masterclass",
    "Speedpaint",
    "Speedpaint Metallic",
    "Warpaints",
    "Warpaints Air",
    "Warpaints Metallic",
    "Warpaints Wash"
  ]
}
```

If Step 1 reveals multiple sub-lines, list each one as its own type string (e.g. `"Effects"`, `"Effects Wash"`) so the generator emits separate `product_lines` rows.

### Step 3: Append Effects entries to `scripts/data/paints/army-painter.json`

Add new objects following the existing `PaintJson` shape used throughout the file:

```json
{
  "id": "ap-fx-01",
  "name": "<Official Name>",
  "hex": "#XXXXXX",
  "type": "Effects",
  "description": "",
  "comparable": []
}
```

Field conventions (matching the existing precedents in this file and the Scale75 doc):

- `id`: lowercase kebab-case brand paint code (`ap-fx-01`, …)
- `name`: paint name exactly as Army Painter lists it
- `hex`: 6-digit uppercase hex
- `type`: must exactly match a string added in Step 2
- `description`: leave `""`; treat any in-page descriptive copy as metadata, not paint data
- `comparable`: `[]` — cross-brand references are out of scope here and belong in the [Paint Database Data Improvement](./05-paint-database-data-improvement.md) doc

Group the new entries together at the end of the file (or in alphabetical order by `type`, matching the file's existing organization — verify before committing).

### Step 4: Regenerate seed and apply locally

```bash
npm run db:seed:generate
npm run db:reset
```

Check the generator's summary log:

- Brand count unchanged (still 6)
- Product line count increased by the number of new `type` strings added in Step 2
- Paint count increased by the number of Effects entries added in Step 3
- No warnings about unresolved paint references

`scripts/generate-seed.ts` already handles:

- Auto-derived product lines from unique `type` strings (no generator code change needed)
- `is_metallic` detection (the type string is lowercased and matched against `"metallic"` — if a sub-line is named `"Effects Metallic"` it will flag correctly)
- Hue assignment via `findClosestColor()` and the paintpad override map

If any new Effects type needs custom flagging (e.g. an `is_wash` style flag), confirm whether the schema supports it before extending the generator. The current schema only has `is_metallic` and `is_discontinued`; any other classification must be modeled via the `paint_type` text column or a follow-up schema change.

### Step 5: Verify in the app

- Navigate to `/brands/army-painter` — confirm a new "Effects" product line appears alongside Fanatic/Warpaints/Speedpaint/Masterclass
- Open the Effects product line — confirm all paints render with correct hex swatches and the expected count
- Search for an Effects paint by name (e.g. via the navbar paint search) — confirm it returns a result
- Open a paint detail page — confirm the swatch, hex, hue assignment, and product-line breadcrumb are correct
- Check the color wheel — Effects paints should be plotted at their computed hue/lightness positions (clear/medium products may cluster near neutral)
- Filter the paints page by `brand = Army Painter` and visually confirm the Effects line is present

### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/brands.json` | Add `Effects` (and any sub-line type strings) to the Army Painter `types` array |
| `scripts/data/paints/army-painter.json` | Append new Effects paint entries — name, code, hex, type, empty description, empty comparable |
| `supabase/seed.sql` | Regenerated by `npm run db:seed:generate`; includes the new product line(s) and paints |
| _(none expected)_ | No `src/` changes anticipated — the schema and paints services already handle arbitrary type strings |

### Risks & Considerations

- **No invented hex values.** Clear/transparent products (mediums, varnishes, gloss/matt finish coats) have no meaningful single-hex representation. Decide per-product whether to include it with a near-neutral hex, exclude it entirely, or flag for a future schema extension — document the choice inline in this doc once Step 1 is complete.
- **Type-string typos break the generator.** The `type` value in `army-painter.json` must exactly match a string in the Army Painter `types` array in `brands.json` — otherwise the paint silently fails to associate with a product line. Validate by spot-checking the generator output for the new line.
- **Brand paint ID collisions.** Confirm the chosen ID prefix (`ap-fx-NN`) does not collide with any existing entry in `army-painter.json` or any cross-brand `comparable` reference elsewhere.
- **Paintpad coverage.** Paintpad.app may not yet index every Effects paint. If a paint is missing from paintpad, fall back to the official Army Painter product page and capture the swatch hex with a color picker; document the source for each such hex in commit notes.
- **Discontinued items.** Some older Effects products may have been retired in the Fanatic relaunch. Verify current availability before adding, or set `is_discontinued = true` in a follow-up if the schema/generator gains that field on the input side (currently the generator only writes `is_discontinued = false`).

## Related / Follow-Ups (Out of Scope)

These are noted as **open questions for future audit**, not commitments in this doc:

- **Other paint lines completeness audit.** Army Painter's Effects line surfaced as a gap; other brands (Citadel, Vallejo, AK Interactive, Green Stuff World, Scale75) may have similar missing sub-lines. A separate audit task should compare each brand's `types` array against the manufacturer's current catalog and file follow-up data docs as needed.
- **Cross-brand `comparable` references for Effects.** Once seeded, identify equivalent Citadel Technical / Vallejo / Green Stuff World effect products and add `comparable` entries — handled by [Paint Database Data Improvement](./05-paint-database-data-improvement.md).
- **Schema extension for non-pigment products.** If multiple brands ship texture pastes, varnishes, and mediums, consider adding a `finish` or `product_class` column to `paints` so the UI can filter or de-emphasize these in color-matching contexts. File as a separate enhancement doc if pursued.
