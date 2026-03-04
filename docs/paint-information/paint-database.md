# Paint Database

**Epic:** Paint Information
**Type:** Feature
**Status:** In Progress

## Summary

A lightweight JSON data store of 190+ miniature paints from four major brands, used as the data source for the color wheel visualization. Paint data is stored as JSON files organized by brand in a `src/data/` directory, with a TypeScript barrel that imports and merges all paint data.

## Acceptance Criteria

- [x] 190+ paints stored as JSON objects across brand-specific files
- [x] Each paint includes: `name`, `hex`, `type`
- [x] Brand metadata stored separately with: `id`, `name`, `icon`, `types[]`
- [x] Supports four brands with their respective icons and paint types:

| Brand             | Icon | Paint Type            |
|-------------------|------|-----------------------|
| Citadel           | ⚔️    | Base, Layer, Edge     |
| Army Painter      | 🛡️    | Warpaints             |
| Vallejo           | 🎯    | Game Color            |
| Green Stuff World | 🧪    | Acrylic               |

- [x] TypeScript types defined for `Paint`, `Brand`, and `PaintEntry` (raw JSON shape)
- [x] Barrel `index.ts` exports merged paint array and brand metadata
- [x] JSON files are importable via `resolveJsonModule` (already enabled in tsconfig)
- [x] Path alias `@data/*` maps to `src/data/*` for clean imports

## File Structure

```
src/data/
  brands.json              # brand metadata array
  paints/
    citadel.json           # Citadel paint entries
    army-painter.json      # Army Painter paint entries
    vallejo.json           # Vallejo paint entries
    green-stuff-world.json # Green Stuff World paint entries
  index.ts                 # barrel — imports JSON, merges, and exports typed data
```

## Data Schemas

### brands.json

```json
[
  {
    "id": "citadel",
    "name": "Citadel",
    "icon": "⚔️",
    "types": ["Base", "Layer", "Edge"]
  },
  {
    "id": "army-painter",
    "name": "Army Painter",
    "icon": "🛡️",
    "types": ["Warpaints"]
  },
  {
    "id": "vallejo",
    "name": "Vallejo",
    "icon": "🎯",
    "types": ["Game Color"]
  },
  {
    "id": "green-stuff-world",
    "name": "Green Stuff World",
    "icon": "🧪",
    "types": ["Acrylic"]
  }
]
```

### paints/{brand}.json

Each file is an array of paint objects. The brand is inferred from the filename (no `brand` field in the object to avoid redundancy).

```json
[
  { "name": "Abaddon Black", "hex": "#231F20", "type": "Base" },
  { "name": "Mephiston Red", "hex": "#9A1115", "type": "Base" },
  { "name": "White Scar", "hex": "#FFFFFF", "type": "Layer" }
]
```

## Implementation Plan

### Step 1: Add path alias

Add `@data/*` path alias to `tsconfig.json`:

```json
"@data/*": ["./src/data/*"]
```

### Step 2: Create TypeScript types

Create `src/types/paint.ts` with:

- `PaintEntry` — raw JSON shape: `{ name: string, hex: string, type: string }`
- `Brand` — brand metadata: `{ id: string, name: string, icon: string, types: string[] }`
- `Paint` — processed paint with brand info attached: `PaintEntry & { brand: string }`

### Step 3: Create brand metadata

Create `src/data/brands.json` with the four brand objects as defined above.

### Step 4: Create paint JSON files

Create one file per brand under `src/data/paints/`:

- `citadel.json`
- `army-painter.json`
- `vallejo.json`
- `green-stuff-world.json`

Each file contains an array of `{ name, hex, type }` objects. Populate with 190+ real miniature paint entries sourced from manufacturer color lists.

### Step 5: Create barrel index

Create `src/data/index.ts` that:

1. Imports all four paint JSON files and `brands.json`
2. Maps each brand's paint entries to `Paint` objects (attaching the brand `id`)
3. Merges into a single `paints` array
4. Exports `paints` (all paints) and `brands` (brand metadata)

### Step 6: Update CLAUDE.md

Update the Architecture section in `CLAUDE.md` to reflect the new data module path (`src/data/`) instead of `app/constants/paints.ts`.

## Risks & Considerations

- **Paint data accuracy** — hex values should be sourced from official brand references or verified community databases
- **JSON bundle size** — 190+ entries is small (~15-20KB), no concern for client-side bundling
- **Future extensibility** — adding a new brand only requires a new JSON file and a brands.json entry
