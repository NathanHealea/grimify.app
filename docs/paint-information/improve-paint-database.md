# Improve Paint Database via PaintPad.app

**Epic:** Paint Information
**Type:** Enhancement
**Status:** Todo

## Summary

Use [paintpad.app](https://paintpad.app) as a data source to expand and update the paint database. This covers:

- **AK Interactive** — add as a new (5th) brand with paint file, brand entry, and data pipeline wiring
- **Army Painter** — add missing ranges (Masterclass, Warpaints, Warpaints Air) beyond current Fanatic/Speedpaint data
- **Citadel** — cross-reference and fill gaps
- **Green Stuff World** — expand from 32 to fuller coverage (104 paints exist in the Maxx Formula range)
- **Vallejo** — add ~11 new ranges (Game Air, Model Air, Mecha Color, Metal Color, Panzer Aces, Nocturna, Surface Primer, etc.)

Current state: 983 paints across 4 brands. Target: significantly expanded coverage with accurate hex values and cross-brand comparables.

## Acceptance Criteria

- [ ] AK Interactive brand entry exists in `src/data/brands.json`
- [ ] `src/data/paints/ak-interactive.json` exists with paints from PaintPad
- [ ] `src/data/index.ts` imports and merges AK Interactive data
- [ ] Army Painter paint count increases (new ranges added from PaintPad)
- [ ] Army Painter `types` array in `brands.json` updated with new range names
- [ ] Citadel paints cross-referenced — missing paints added, hex values updated where PaintPad has better data
- [ ] Green Stuff World paint count increases beyond 32
- [ ] Vallejo paint count increases (new ranges added from PaintPad)
- [ ] Vallejo `types` array in `brands.json` updated with new range names
- [ ] All paint entries follow the JSON schema: `id`, `name`, `hex`, `type`, `description`, `comparable`
- [ ] No duplicate paint IDs within any brand file
- [ ] Every `type` value used in paint entries exists in the brand's `types` array in `brands.json`
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

## Implementation Plan

### Key Files

| File | Changes |
|------|---------|
| `src/data/brands.json` | Add AK Interactive brand; update types arrays for Army Painter, Vallejo, Green Stuff World |
| `src/data/paints/ak-interactive.json` | **New** — AK Interactive paint entries |
| `src/data/paints/army-painter.json` | Add paints from new ranges |
| `src/data/paints/citadel.json` | Add missing paints, update hex values |
| `src/data/paints/green-stuff-world.json` | Add missing paints |
| `src/data/paints/vallejo.json` | Add paints from new ranges |
| `src/data/index.ts` | Import AK Interactive data |

### Reference: JSON Schemas

**Brand entry** (`brands.json`):
```json
{
  "id": "brand-slug",
  "name": "Display Name",
  "icon": "emoji",
  "color": "#hex",
  "types": ["Range Name 1", "Range Name 2"]
}
```

**Paint entry** (`paints/<brand-id>.json`):
```json
{
  "id": "<prefix>-<number>",
  "name": "Paint Name",
  "hex": "#RRGGBB",
  "type": "Range Name",
  "description": "",
  "comparable": [
    { "id": "<prefix>-<number>", "name": "Paint Name" }
  ]
}
```

**ID prefixes:** `cit-`, `ap-`, `val-`, `gsw-`, `ak-` (new). IDs are sequential per brand — continue from the highest existing number.

### Reference: What to Extract from PaintPad

For each paint on a PaintPad page, capture:
1. **Name** — exact paint name as shown
2. **Hex color** — swatch color code (visible on paint detail/list pages)
3. **Type** — paint range/sub-line (e.g., "3rd Gen Acrylics", "Model Color")
4. **Comparable paints** — cross-brand equivalents listed by PaintPad; reference by existing ID and name in our database

If PaintPad doesn't provide a hex code, estimate from the swatch image or color name.

### Step 1: Add AK Interactive brand and scaffold

Add AK Interactive to `src/data/brands.json`:
```json
{
  "id": "ak-interactive",
  "name": "AK Interactive",
  "icon": "🎨",
  "color": "#F57C00",
  "types": []
}
```
The `types` array will be populated as ranges are discovered from PaintPad in Step 2.

Create an empty `src/data/paints/ak-interactive.json` (`[]`).

Update `src/data/index.ts` to import and register the new file:
```typescript
import akInteractiveData from './paints/ak-interactive.json';
// add to brandPaints array:
['ak-interactive', akInteractiveData],
```

Commit: `feat(data): scaffold ak-interactive brand`

### Step 2: Fetch and populate AK Interactive paints

Fetch each PaintPad page and extract paint data:
- https://paintpad.app/paints/ak-interactive
- https://paintpad.app/paints/ak-interactive-3rd-gen-acrylics
- https://paintpad.app/paints/abteilung-502
- https://paintpad.app/paints/ak-interactive-acrylics

For each paint found:
1. Assign an `ak-<n>` ID (sequential starting at 1)
2. Determine the `type` from the PaintPad page/sub-range name (e.g., "3rd Gen Acrylics", "Abteilung 502")
3. Extract hex value and name
4. Populate `comparable` with any cross-brand equivalents PaintPad provides (match to existing IDs in our data)
5. Add to `ak-interactive.json`

After all paints are added, update the `types` array in `brands.json` with the distinct type values found.

Commit: `feat(data): add ak-interactive paints from paintpad`

### Step 3: Expand Army Painter data

Fetch each PaintPad page:
- https://paintpad.app/paints/the-army-painter-masterclass
- https://paintpad.app/paints/the-army-painter-speedpaint-2-0
- https://paintpad.app/paints/the-army-painter-warpaints
- https://paintpad.app/paints/the-army-painter-warpaints-air
- https://paintpad.app/paints/the-army-painter-warpaints-fanatic

**Current data:** 286 paints across Fanatic, Fanatic Metallic, Fanatic Wash, Speedpaint.

For each PaintPad page:
1. Extract all paints with name, hex, type
2. Match against existing `army-painter.json` by name — skip duplicates
3. Append new paints with sequential `ap-<n>` IDs (continue from `ap-286`)
4. Add new range names to `types` in `brands.json` (e.g., "Masterclass", "Warpaints", "Warpaints Air")

Commit: `feat(data): expand army-painter paints from paintpad`

### Step 4: Update Citadel data

Fetch PaintPad page:
- https://paintpad.app/paints/citadel-painting-system

**Current data:** 306 paints across 9 types.

1. Extract all paints from PaintPad
2. Match against existing `citadel.json` by name
3. Add any missing paints with sequential `cit-<n>` IDs (continue from `cit-306`)
4. If PaintPad provides a different hex for an existing paint, update it only if the PaintPad value appears more accurate

Commit: `feat(data): update citadel paints from paintpad`

### Step 5: Expand Green Stuff World data

Fetch PaintPad page:
- https://paintpad.app/paints/green-stuff-world

**Current data:** 32 paints, all typed "Acrylic". The Maxx Formula range has 104 paints total.

1. Extract all paints from PaintPad
2. Match against existing `green-stuff-world.json` by name — skip duplicates
3. Append new paints with sequential `gsw-<n>` IDs (continue from `gsw-32`)
4. If PaintPad reveals distinct sub-ranges beyond "Acrylic", add them to `types` in `brands.json`

Commit: `feat(data): expand green-stuff-world paints from paintpad`

### Step 6: Expand Vallejo data with new ranges

Fetch each PaintPad page:
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
- https://paintpad.app/paints/vallejo-nocturna
- https://paintpad.app/paints/vallejo-panzer-aces
- https://paintpad.app/paints/vallejo-surface-primer
- https://paintpad.app/paints/vallejo-the-shifters
- https://paintpad.app/paints/vallejo-xpress

**Current data:** 359 paints across 8 types (Model Color, Game Color, Game Color Metallic, Game Color Ink, Game Color Wash, Xpress Color, Model Wash, Liquid Metal).

1. For existing ranges (Model Color, Game Color, Xpress, Model Wash): match by name, add missing paints
2. For new ranges (Game Air, Model Air, Mecha Color, Metal Color, Panzer Aces, Nocturna, Surface Primer, Hobby Spray Paint, The Shifters, Auxiliaries, Liquid Gold): add all paints found
3. All new paints get sequential `val-<n>` IDs (continue from `val-359`)
4. Update `types` array in `brands.json` with new range names

Commit: `feat(data): expand vallejo paints from paintpad`

### Step 7: Validate and verify

1. Verify all JSON files parse without errors
2. Check no duplicate IDs exist within any brand file
3. Check every `type` value in paint entries exists in the brand's `types` array
4. Run `npm run build` — fix any errors
5. Run `npm run lint` — fix any warnings

Commit (if fixes needed): `fix(data): resolve validation issues`

### Risks & Considerations

- **PaintPad page structure** — PaintPad may use client-side rendering, making HTML extraction unreliable. If a page returns minimal HTML, try fetching the page's API endpoint or JSON payload instead.
- **Hex availability** — Not all PaintPad listings include hex codes. For paints without hex, estimate from color name or swatch and set `description` to note the estimation.
- **Large scope** — ~30 PaintPad pages to process. If any page is inaccessible or empty, skip it and note in the commit message rather than blocking the entire task.
- **Comparable mapping** — PaintPad may list cross-brand equivalents by name but not by our internal IDs. Match by name against existing data; leave `comparable` empty for paints with no match.
- **Performance** — Adding hundreds of paints increases the dataset significantly. The app already handles ~983 paints; verify the build succeeds but don't optimize prematurely.
