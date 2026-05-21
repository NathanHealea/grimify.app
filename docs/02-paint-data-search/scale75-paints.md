# Scale75 Paint Indexing

**Epic:** Paint Data & Search
**Type:** Enhancement
**Status:** Completed
**Branch:** `enhancement/scale75-paints`
**Merge into:** `main`

## Summary

Index all Scale75 paint product lines into the Grimify paint database. Scale75 is a Spanish miniature paint manufacturer known for high-pigment density paints aimed at advanced painters. Adding them expands the cross-brand comparison and color wheel with approximately 545 new paints across 12 product lines.

This enhancement follows the same data pipeline used for existing brands: a JSON data file feeds `scripts/generate-seed.ts`, which produces `supabase/seed.sql`. The primary effort is sourcing accurate hex color values for each paint — paintpad.app and Scale75's own product pages are the primary references.

### Product Lines to Index

Data sourced from paintpad.app. The `/paints/scalecolor` page covers multiple sub-lines; Soilworks Oil Washes and Soilworks Pigments are **excluded** (weathering products, not acrylic paints).

| Product Line | Type value in JSON | Codes | Count |
|---|---|---|---|
| Drop & Paint | `Drop & Paint` | SDP-01–SDP-128 | 128 |
| Instant Colors | `Instant Colors` | SIN-00–SIN-47 | 48 |
| Mystic Colors | `Mystic Colors` | SMC-01–SMC-25 | 25 |
| Prism Effect | `Prism Effect` | SPE-01–SPE-16 | 16 |
| Scalecolor | `Scalecolor` | SC-00–SC-62 | 62 |
| Metal n' Alchemy | `Metal n' Alchemy` | SC-63–SC-94 | 32 |
| Inktensity | `Inktensity` | SC-95–SC-102 | ~16 |
| Fantasy & Games | `Fantasy & Games` | SFG-00–SFG-47 | 47 |
| Warfront | `Warfront` | SW-00–SW-63 | 63 |
| FX Fluor | `FX Fluor` | SFX-00–SFX-07 | 7 |
| Scalecolor Artist | `Scalecolor Artist` | SART-01–SART-84 | 84 |
| Scalecolor Floww | `Scalecolor Floww` | SFL-01–SFL-24 | 24 |

**Total: ~552 paints**

## Acceptance Criteria

- [x] Scale75 brand entry exists in `scripts/data/brands.json`
- [x] `scripts/data/paints/scale75.json` contains all 12 product lines with accurate names, brand paint IDs, types, and hex values
- [x] All hex values are sourced from Scale75 official product pages or paintpad.app individual paint pages — no placeholder values
- [x] `scripts/generate-seed.ts` is updated to include `scale75` in `PAINT_FILES` and `BRAND_WEBSITES`
- [x] `npm run db:seed:generate` runs without errors
- [x] `npm run db:reset` applies cleanly with no SQL errors
- [ ] Scale75 paints appear on the brands page and are searchable
- [x] Metal n' Alchemy paints are flagged `is_metallic = true` (automatic — generator detects "metal" in type name)
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Add Scale75 brand entry (`scripts/data/brands.json`)

Add a new entry to the brands array:

```json
{
  "id": "scale75",
  "name": "Scale75",
  "icon": "🎭",
  "color": "#E8500A",
  "types": [
    "Drop & Paint",
    "Instant Colors",
    "Mystic Colors",
    "Prism Effect",
    "Scalecolor",
    "Metal n' Alchemy",
    "Inktensity",
    "Fantasy & Games",
    "Warfront",
    "FX Fluor",
    "Scalecolor Artist",
    "Scalecolor Floww"
  ]
}
```

The `color` should match Scale75's orange brand color. Verify against their website before committing.

---

### Step 2: Source hex color data for all Scale75 paints

This is the most time-intensive step. Each paint needs a verified hex value — no placeholder values are acceptable since hex drives RGB/HSL computation and hue assignment.

**Primary sources (in order of preference):**
1. **paintpad.app individual paint pages** — e.g. `https://paintpad.app/paints/scalecolor/sc-01-white`. Each paint page lists the hex swatch.
2. **Scale75 official website** — `https://scale75.com` product pages for each range.
3. **Community databases** — if the above don't cover a paint, cross-reference hobby community color databases.

**Approach:**
- Work product line by product line (12 lines total)
- For each paint, record: name, brand paint code (e.g. `SDP-01`), hex value, product line type string
- Use the product code as the `id` field in the JSON (lowercased, e.g. `sdp-01`)
- Keep a running tally; flag any paints where hex is uncertain

**Special considerations:**
- `Metal n' Alchemy` paints: metallic — hex approximates the base color tone; the `is_metallic` flag is automatically set by the generator because the type contains "Metal"
- `Prism Effect` paints: iridescent/chameleon effects — use the primary reflected color as the hex approximation
- `Instant Colors`: bottle-effect paints — use the paint's body color (not the pooled shadow color) for hex
- `FX Fluor` paints: fluorescent — use the visible swatch color directly

---

### Step 3: Create `scripts/data/paints/scale75.json`

Create the file following the existing `PaintJson` schema used by all other brand files:

```json
[
  {
    "id": "sdp-01",
    "name": "Golden Flesh",
    "hex": "#XXXXXX",
    "type": "Drop & Paint",
    "description": "",
    "comparable": []
  },
  ...
]
```

**Field conventions:**
- `id`: brand paint code, lowercased with hyphens (e.g. `sdp-01`, `sin-00`, `sc-01`, `sfg-00`, `sw-00`, `sart-01`, `sfl-01`, `spe-01`, `smc-01`, `sfx-00`)
- `name`: paint name exactly as listed on paintpad.app
- `hex`: 6-digit uppercase hex (e.g. `#A3B4C5`)
- `type`: must exactly match one of the 12 type strings in the table above — this determines which product line the paint is inserted into
- `description`: leave empty string `""` for now
- `comparable`: leave empty array `[]` — cross-brand references can be added in a follow-up

Organize the JSON file in product-line order (all Drop & Paint paints first, then Instant Colors, etc.) for readability.

---

### Step 4: Update `scripts/generate-seed.ts`

Two additions are required:

**Add to `BRAND_WEBSITES`:**
```typescript
const BRAND_WEBSITES: Record<string, string> = {
  // ... existing entries ...
  'scale75': 'https://scale75.com',
}
```

**Add to `PAINT_FILES`:**
```typescript
const PAINT_FILES: Record<string, string> = {
  // ... existing entries ...
  'scale75': 'scale75.json',
}
```

No other changes to the generator are needed — product lines are auto-derived from unique `type` values, metallic detection handles `Metal n' Alchemy` automatically, and hue assignment runs algorithmically.

---

### Step 5: Regenerate seed and apply

```bash
npm run db:seed:generate
npm run db:reset
```

Verify the summary line printed by the generator shows the expected brand count, paint count, and no warnings about unresolved paint references.

---

### Step 6: Verify in the app

- Navigate to `/brands` — Scale75 should appear in the brand list
- Open Scale75 → confirm all 12 product lines are visible with correct paint counts
- Search for a Scale75 paint by name — confirm search returns results
- Open a Scale75 paint detail page — confirm hex swatch renders correctly
- Check color wheel — Scale75 paints should appear mapped to their hues

### Affected Files

| File | Changes |
|------|---------|
| `scripts/data/brands.json` | Add Scale75 brand entry |
| `scripts/data/paints/scale75.json` | New file — all Scale75 paint data |
| `scripts/generate-seed.ts` | Add `scale75` to `PAINT_FILES` and `BRAND_WEBSITES` |
| `supabase/seed.sql` | Regenerated — includes Scale75 brands, product lines, and paints |

### Risks & Considerations

- **Hex accuracy for special-effect paints:** Metallic, iridescent, and fluorescent paints cannot be represented faithfully by a single hex — use the dominant/primary tone. Document any paints where the hex is a deliberate approximation.
- **Soilworks exclusion:** The `/paints/scalecolor` paintpad page lists Soilworks Oil Washes (WA/WE series) and Soilworks Pigments — these are not acrylic miniature paints and must be excluded from `scale75.json`.
- **Code range overlaps:** Inktensity codes may overlap with Metal n' Alchemy in the SC-79–SC-102 range; verify exact ranges from the official Scale75 website before assigning IDs.
- **Scale-up risk:** At ~552 paints this is the second-largest single-brand addition. Run `db:reset` against a local Supabase instance before pushing.
- **`comparable` cross-references:** Paint references to other brands (e.g. Scale75 ↔ Vallejo equivalents) are out of scope for this enhancement — that work belongs in the Paint Database Data Improvement doc.
