# AK Interactive Paint Data

**Epic:** Paint Information
**Type:** Feature
**Status:** Todo

## Summary

Add AK Interactive 3rd Generation Acrylics as the fifth paint brand in the color wheel application. AK Interactive is a major miniature paint manufacturer with ~400+ paints across multiple series (Generic, AFV, Figure, Air). This feature creates the `ak-interactive.json` data file, registers the brand in `brands.json`, and wires it into the data pipeline.

Data is sourced from four reference PDFs:

- **CATALOGO_WARGAMES_2024.pdf** (pages 14-21) — complete paint catalog with REF, TYPE, NAME, color swatches, and cross-references to Vallejo, Tamiya, Humbrol, Gunze, RAL, FS, Citadel, and more
- **equiv_ak-vallejo.pdf** — AK reference to Vallejo Model Color number mappings (~236 entries with Vallejo equivalents)
- **equiv_vallejo-ak.pdf** — reverse Vallejo to AK mappings (confirms the above)
- **AKCATALOGUE2021.pdf** — older 2021 catalog (supplementary reference)

## Acceptance Criteria

- [ ] `src/data/paints/ak-interactive.json` exists with all AK 3Gen paints (AK11001-AK11235, AK11270-AK11279)
- [ ] `src/data/paints/ak-interactive.json` includes AFV series paints (AK11301-AK11387)
- [ ] `src/data/paints/ak-interactive.json` includes Figure series paints (AK11401-AK11440)
- [ ] `src/data/paints/ak-interactive.json` includes Air series paints (AK11801-AK11920)
- [ ] Each paint entry has `id`, `name`, `hex`, `type`, `description`, and `comparable` fields matching the existing JSON schema
- [ ] `src/data/brands.json` includes AK Interactive brand entry with appropriate types
- [ ] `src/data/index.ts` imports and merges AK Interactive data into the paint pipeline
- [ ] Hex values are sourced using the same methodology as the paint-range-data-expansion (Vallejo equivalents, Encycolorpedia, community databases, estimation)
- [ ] `comparable` field is populated using the AK-Vallejo equivalence tables from the PDFs
- [ ] Auxiliary products (retarder, mediums, varnishes, primers, thinners) are excluded — only color paints are included
- [ ] Effects paints (blood, viscera, chipping) are excluded
- [ ] App builds and lints successfully with the new data

## Implementation Plan

### Step 1: Compile the AK paint master list from PDF data

Extract every paint entry from the Wargames 2024 catalog (pages 14-21). The catalog provides structured tables with:

| Column | Description |
|--------|-------------|
| REF | AK reference number (e.g. AK11001) |
| TYPE | Series label marker (blank for 3Gen generic, AFV, FIG, AIR) |
| NAME | Paint name (e.g. "White", "RAF Dark Earth") |
| COLOR | Visual swatch (used for hex estimation as last resort) |
| VALLEJO | Vallejo Model Color reference number |

**Paint ranges to include:**

| Range | Series | Count (approx.) |
|-------|--------|-----------------|
| AK11001-AK11120 | 3Gen (Standard, Pastel, Intense, Color Punch) | 120 |
| AK11121-AK11200 | 3Gen (continued — browns, greens, blues) | ~80 |
| AK11270-AK11279 | 3Gen (special wargame colors — Dragon Blood, Cold Green, etc.) | 10 |
| AK11191-AK11210 | 3Gen Metallic (Gold, Silver, Copper, etc.) | ~20 |
| AK11213-AK11218 | 3Gen Clear/Transparent | 6 |
| AK11301-AK11387 | AFV Colors (military vehicle colors) | ~87 |
| AK11401-AK11440 | Figure Colors (historical uniform colors) | 40 |
| AK11801-AK11920 | Air Colors (aircraft colors) | ~120 |

**Paints to EXCLUDE:**

- AK11231-AK11235: Auxiliary products (Retarder, Metal Medium, Glaze Medium, Matte Medium, Gloss Medium)
- AK11237-AK11252: Varnishes and primers
- AK11260-AK11262: Effects (Blood, Viscera, Chipping)
- AK11500/AK11505: Thinner/cleaner

### Step 2: Determine paint types for brand registration

Based on the catalog structure, AK Interactive paints fall into these type categories:

```json
{
  "id": "ak-interactive",
  "name": "AK Interactive",
  "icon": "🎨",
  "color": "#F57C00",
  "types": ["3Gen", "3Gen Metallic", "3Gen Pastel", "AFV", "Figure", "Air"]
}
```

**Type assignment rules from the catalog (page 8):**

| Catalog Indicator | Type to assign |
|-------------------|---------------|
| Orange dot (standard/clear/fluorescent) | "3Gen" |
| Dark blue circle (metallic) | "3Gen Metallic" |
| Pastel blue circle | "3Gen Pastel" |
| Yellow circle (intense) | "3Gen" (subset, not separate type) |
| Color Punch yellow | "3Gen" (subset, not separate type) |
| AFV label | "AFV" |
| Figure label | "Figure" |
| Air label | "Air" |

Intense and Color Punch are marketing sub-categories of the standard 3Gen range, not distinct paint types — group them under "3Gen" to match how other brands handle similar distinctions (e.g., Citadel "Layer" vs "Edge" are separate, but Vallejo doesn't split "Game Color" into "Game Color Intense").

### Step 3: Source hex values

Use a tiered approach (matching the methodology from paint-range-data-expansion):

**Tier 1 — Vallejo equivalent mapping (~150 paints):**
The equivalence PDFs provide ~150 AK-to-Vallejo mappings. For each mapped pair:
1. Look up the Vallejo number in `src/data/paints/vallejo.json`
2. Use the Vallejo paint's hex value as the starting point for the AK paint
3. Note: equivalent doesn't mean identical — colors are close but may differ slightly

**Tier 2 — External verified sources:**
For paints without Vallejo equivalents, research hex values from:
- Encycolorpedia AK Interactive pages
- Redgrimm community paint databases
- HandWiki color reference tables
- PaintRack or similar hobbyist tools

**Tier 3 — Standard color references:**
Many AFV and Air paints reference standard color systems:
- RAL numbers (e.g., "RAL 7009 Hellgrau") — well-documented hex values
- FS numbers (e.g., "FS 34097") — Federal Standard color database
- RLM numbers (e.g., "RLM 70") — Luftwaffe color standards

These standards have authoritative hex mappings that provide reliable values.

**Tier 4 — Estimation:**
For remaining paints, estimate from:
- Color name descriptions
- Color swatches in the PDF catalog
- Comparison with similar paints in the existing database

### Step 4: Build the comparable field from equivalence data

The equiv PDFs provide bidirectional AK ↔ Vallejo mappings. Additionally, the Wargames catalog tables include cross-references to Citadel.

For each AK paint with a Vallejo equivalent:
1. Find the Vallejo number in the equiv table
2. Match it to a paint in `vallejo.json` by Vallejo catalog number
3. Add to the `comparable` array: `{"id": "val-XX", "name": "Paint Name"}`

For AK paints with Citadel equivalents (from the catalog CITADEL column):
1. Match the Citadel stock number to a paint in `citadel.json`
2. Add to the `comparable` array: `{"id": "cit-XX", "name": "Paint Name"}`

### Step 5: Create the JSON data file

Create `src/data/paints/ak-interactive.json` following the established pattern:

```json
[
  {
    "id": "ak-1",
    "name": "White",
    "hex": "#FFFFFF",
    "type": "3Gen",
    "description": "",
    "comparable": [
      {"id": "val-1", "name": "White"}
    ]
  }
]
```

**ID convention:** `ak-{sequential number}` starting at 1, following the pattern of other brands (`val-1`, `cit-1`, `ap-1`, `gsw-1`).

**Ordering:** Group by type (3Gen, 3Gen Metallic, 3Gen Pastel, AFV, Figure, Air), then by reference number within each type.

### Step 6: Register the brand

Update `src/data/brands.json` to add AK Interactive as the fifth brand entry.

Update `src/data/index.ts` to:
1. Import `ak-interactive.json`
2. Add `['ak-interactive', akInteractiveData]` to the `brandPaints` array

### Step 7: Verify integration

1. Run `npm run build` to ensure no compilation errors
2. Run `npm run lint` to ensure code quality
3. Verify the paint count increased appropriately in the app
4. Spot-check several paints render on the color wheel at reasonable positions

### Affected Files

| File | Changes |
|------|---------|
| `src/data/paints/ak-interactive.json` | **New** — AK Interactive paint data (~400+ entries) |
| `src/data/brands.json` | Add AK Interactive brand entry |
| `src/data/index.ts` | Import and merge AK Interactive data |

### Risks & Considerations

- **Hex accuracy:** The equivalence PDFs provide Vallejo matches for ~150 of ~400+ paints. The remaining paints need hex values from external research or estimation. Document confidence level per paint where possible.
- **Equivalence mapping:** The Vallejo numbers in the equiv PDFs use different formats — some are 3-digit Model Color numbers (e.g., 951), others are 5-digit Air/Model numbers (e.g., 71027, 70341). These map to different Vallejo sub-ranges and need careful matching.
- **Paint name localization:** Some AFV/Air paints have names in multiple languages or include technical designations (RAL, FS, RLM). Use the English name from the catalog.
- **Large dataset:** Adding ~400+ paints increases the total from ~983 to ~1,380+. Verify performance remains acceptable on the color wheel SVG rendering.
- **Dual Exo, Inks, and Wargame Color ranges** (AK1501-AK1542, AK16001-AK16014, AK1201-AK1243) are separate product lines from the 3Gen acrylics. These could be added in a follow-up enhancement if desired, but are out of scope for this feature.

### Reference Data Summary

**AK → Vallejo equivalence (from equiv_ak-vallejo.pdf, page 1):**

The 3Gen range (AK11001-AK11236) has Vallejo Model Color equivalents for approximately 150 paints. Examples:
- AK11001 → Vallejo 951 (White)
- AK11002 → Vallejo 820 (Offwhite)
- AK11029 → Vallejo 950 (Black)

The AFV range (AK11301-AK11387) has Vallejo Model Air equivalents. Examples:
- AK11302 → Vallejo 71027
- AK11305 → Vallejo 71006

The Figure range (AK11401-AK11440) has mixed Vallejo equivalents (Model Color + Panzer Aces). Examples:
- AK11401 → Vallejo 70341
- AK11405 → Vallejo 982
- AK11417 → Vallejo 875

**Cross-brand references (from Wargames catalog tables):**

The catalog tables also include columns for Tamiya, Humbrol, Gunze/Mr.Hobby, Testor, RLM, RAL, FS, Revell, Real Colors, and Citadel. These provide additional cross-reference data, though only the Vallejo and Citadel mappings are immediately useful for the `comparable` field (since those brands exist in the app).
