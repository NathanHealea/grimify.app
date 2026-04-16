# Paint Data Model and Seed Data

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Completed
**Branch:** `feature/paint-data-model`
**Merge into:** `v1/main`

## Summary

Design and implement the core database schema for storing miniature paint data across multiple brands and product lines. Build a seed generator that converts the existing JSON paint data (on `main` branch in `src/data/`) into SQL, covering all 5 brands and 2,337 paints with cross-brand references.

## Acceptance Criteria

- [x] A `brands` table exists with manufacturer information
- [x] A `product_lines` table exists linking paint ranges to brands
- [x] A `paints` table exists with color data (name, hex, RGB, HSL values)
- [x] A `paint_references` table exists linking related paints with relationship type and similarity score
- [x] A seed generator script (`scripts/generate-seed.ts`) converts JSON data to SQL
- [x] Seed data covers all 5 brands from `main` branch data (Citadel, Army Painter, Vallejo, Green Stuff World, AK Interactive — 2,337 paints)
- [x] Each paint has accurate hex color values with computed RGB and HSL
- [x] Paint references are seeded from the `comparable` data (334 cross-brand alternatives)
- [x] RLS policies allow all users to read paint data
- [x] Only admins can insert/update/delete paint data
- [x] `npm run build` and `npm run lint` pass with no errors

## Database

### `brands` Table

| Column        | Type          | Constraints               |
| ------------- | ------------- | ------------------------- |
| `id`          | `serial`      | Primary key               |
| `name`        | `text`        | Unique, not null          |
| `slug`        | `text`        | Unique, not null          |
| `website_url` | `text`        | Nullable                  |
| `logo_url`    | `text`        | Nullable                  |
| `created_at`  | `timestamptz` | Not null, default `now()` |

### `product_lines` Table

| Column        | Type          | Constraints                 |
| ------------- | ------------- | --------------------------- |
| `id`          | `serial`      | Primary key                 |
| `brand_id`    | `int`         | FK to `brands.id`, not null |
| `name`        | `text`        | Not null                    |
| `slug`        | `text`        | Not null                    |
| `description` | `text`        | Nullable                    |
| `created_at`  | `timestamptz` | Not null, default `now()`   |

Unique constraint on `(brand_id, slug)`.

### `paints` Table

| Column            | Type          | Constraints                                              |
| ----------------- | ------------- | -------------------------------------------------------- |
| `id`              | `serial`      | Primary key                                              |
| `product_line_id` | `int`         | FK to `product_lines.id`, not null                       |
| `name`            | `text`        | Not null                                                 |
| `slug`            | `text`        | Not null                                                 |
| `hex`             | `text`        | Not null (e.g., `#FF5733`)                               |
| `r`               | `int`         | Not null (0-255)                                         |
| `g`               | `int`         | Not null (0-255)                                         |
| `b`               | `int`         | Not null (0-255)                                         |
| `hue`             | `float`       | Not null (0-360)                                         |
| `saturation`      | `float`       | Not null (0-100)                                         |
| `lightness`       | `float`       | Not null (0-100)                                         |
| `is_metallic`     | `boolean`     | Not null, default `false`                                |
| `is_discontinued` | `boolean`     | Not null, default `false`                                |
| `paint_type`      | `text`        | Nullable (e.g., base, layer, shade, contrast, technical) |
| `created_at`      | `timestamptz` | Not null, default `now()`                                |
| `updated_at`      | `timestamptz` | Not null, default `now()`                                |

Unique constraint on `(product_line_id, slug)`.

### `paint_references` Table

Links paints to related paints across brands and product lines. Each row represents a directional relationship from one paint to another, categorized by type and scored by similarity. The UI groups "similar" references by the related paint's `paint_type` (e.g., "Similar base paints", "Similar layer paints").

| Column             | Type          | Constraints                        |
| ------------------ | ------------- | ---------------------------------- |
| `id`               | `serial`      | Primary key                        |
| `paint_id`         | `int`         | FK to `paints.id`, not null        |
| `related_paint_id` | `int`         | FK to `paints.id`, not null        |
| `relationship`     | `text`        | Not null (e.g., `similar`, `alternative`, `complement`) |
| `similarity_score` | `float`       | Nullable (0-100, percentage match) |
| `created_at`       | `timestamptz` | Not null, default `now()`          |

Unique constraint on `(paint_id, related_paint_id, relationship)`.
Check constraint: `paint_id != related_paint_id`.
Check constraint: `similarity_score` between 0 and 100 (when not null).

#### Relationship types

| Value           | Meaning |
| --------------- | ------- |
| `similar`       | Color-similar paint (grouped in UI by the related paint's `paint_type`) |
| `alternative`   | Direct equivalent/replacement from another brand |
| `complement`    | Complementary color on the color wheel |

### Row Level Security

All four tables:

- **SELECT**: Public read access (no auth required — paint data is browsable by everyone)
- **INSERT / UPDATE / DELETE**: Only admin role users

## Implementation Plan

### Step 1: Database migration

Create `supabase/migrations/20260413000000_create_paint_tables.sql` following the existing migration patterns (see `20260412000000_create_roles.sql` for style reference).

#### Tables

Create the four tables in order (`brands` → `product_lines` → `paints` → `paint_references`) with all columns, constraints, and foreign keys as specified in the Database section above. Use `ON DELETE CASCADE` for foreign keys so deleting a brand cascades through product lines to paints, and deleting a paint cascades its references.

#### Indexes

Add indexes for common query patterns:

- `brands.slug` — already covered by unique constraint
- `product_lines.brand_id` — FK lookup
- `product_lines(brand_id, slug)` — already covered by unique constraint
- `paints.product_line_id` — FK lookup
- `paints(product_line_id, slug)` — already covered by unique constraint
- `paints.hex` — color search by exact hex
- `paints.hue` — color wheel angle queries
- `paints.paint_type` — filter by type
- `paints(is_metallic)` — filter metallics (partial index `WHERE is_metallic = true`)
- `paints(is_discontinued)` — filter discontinued (partial index `WHERE is_discontinued = true`)
- `paint_references.paint_id` — lookup references for a given paint
- `paint_references.related_paint_id` — reverse lookup
- `paint_references.relationship` — filter by relationship type

#### RLS policies

Enable RLS on all three tables. Policy pattern:

- **SELECT**: Public read access (no auth required — use default `TO public` so both `anon` and `authenticated` roles can read):
  ```sql
  CREATE POLICY "Anyone can view brands"
    ON public.brands
    FOR SELECT
    USING (true);
  ```
- **INSERT / UPDATE / DELETE**: Admin-only using the existing `get_user_roles()` helper:
  ```sql
  CREATE POLICY "Admins can insert brands"
    ON public.brands
    FOR INSERT
    TO authenticated
    WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));
  ```

Repeat the pattern for all four tables (brands, product_lines, paints, paint_references).

#### Affected files

| File | Changes |
|------|---------|
| `supabase/migrations/20260413000000_create_paint_tables.sql` | New — full migration with tables, indexes, RLS |

### Step 2: Build seed generator script

Create a Node.js script (`scripts/generate-seed.ts`) that reads the JSON paint data from the `main` branch's `src/data/` directory and outputs a complete `supabase/seed.sql` file. This automates the conversion of 2,337+ paints into SQL and ensures the seed stays reproducible.

#### Source data (on `main` branch in `src/data/`)

| File | Records | Notes |
|------|---------|-------|
| `src/data/brands.json` | 5 brands | Citadel, Army Painter, Vallejo, Green Stuff World, AK Interactive |
| `src/data/paints/citadel.json` | 341 paints | 9 types, 143 have comparable refs |
| `src/data/paints/army-painter.json` | 461 paints | 10 types, 107 have comparable refs |
| `src/data/paints/vallejo.json` | 763 paints | 14 types, 60 have comparable refs |
| `src/data/paints/green-stuff-world.json` | 122 paints | 2 types, 0 comparable refs |
| `src/data/paints/ak-interactive.json` | 650 paints | 10 types, 0 comparable refs |
| **Total** | **2,337 paints** | **334 comparable references** |

Each paint JSON entry has: `id`, `name`, `hex`, `type`, `description`, `comparable[]` (with `id` and `name` of related paints).

#### Script responsibilities

1. **Copy JSON files** from `main` branch into `scripts/data/` (or read them directly via `git show main:...` at build time) so the generator is self-contained.

2. **Parse brands** from `brands.json` → generate `INSERT INTO public.brands` statements. Map brand fields:
   - `id` → `slug` (e.g., `"citadel"`)
   - `name` → `name`
   - Website URLs hardcoded per brand (not in the JSON)

3. **Derive product lines** from the unique `type` values across each brand's paint entries → generate `INSERT INTO public.product_lines`. Slugify the type name (e.g., `"Game Color"` → `"game-color"`).

4. **Convert paints** from each JSON file → generate `INSERT INTO public.paints`. For each paint:
   - Parse `hex` → compute `r`, `g`, `b` (extract from hex string)
   - Compute `hue`, `saturation`, `lightness` from RGB using the standard HSL algorithm
   - Slugify `name` for the `slug` column
   - Set `paint_type` from the JSON `type` field (lowercased)
   - Set `is_metallic = true` when `type` contains "Metallic" or "Metal"
   - Set `is_discontinued = false` for all (no discontinuation data in JSON)
   - Reference `product_line_id` via subquery on `(brand_slug, type_slug)`

5. **Convert comparable references** → generate `INSERT INTO public.paint_references`. For each paint that has a `comparable[]` array:
   - Look up the source paint by its JSON `id` (e.g., `"cit-2"`) → map to its slug
   - Look up the target paint by the comparable's `id` (e.g., `"ap-95"`) → map to its slug
   - Set `relationship = 'alternative'` (the comparable data represents direct brand equivalents)
   - Set `similarity_score = NULL` (no score data in the JSON; similarity scores will be computed later)

6. **Write output** to `supabase/seed.sql` with clear section headers and comments.

#### Hex → RGB → HSL conversion

```typescript
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s: s * 100, l: l * 100 }
}
```

#### Running the script

Add an npm script to `package.json`:

```json
"db:seed:generate": "npx tsx scripts/generate-seed.ts"
```

Workflow: run `npm run db:seed:generate` → review `supabase/seed.sql` → run `npm run db:reset` to apply.

#### Affected files

| File | Changes |
|------|---------|
| `scripts/generate-seed.ts` | New — reads JSON data, outputs SQL |
| `scripts/data/brands.json` | New — copied from `main:src/data/brands.json` |
| `scripts/data/paints/*.json` | New — copied from `main:src/data/paints/*.json` |
| `supabase/seed.sql` | Replaced — generated output with all brands, product lines, paints, and references |
| `package.json` | Add `db:seed:generate` script |

### Step 3: TypeScript types

Create `src/types/paint.ts` with manually authored types that match the database schema. These provide readable type aliases until generated types from `npm run db:types` are available.

```typescript
/** A miniature paint manufacturer. */
export type Brand = {
  id: number
  name: string
  slug: string
  website_url: string | null
  logo_url: string | null
  created_at: string
}

/** A product line within a brand (e.g., Citadel Base, Vallejo Game Color). */
export type ProductLine = {
  id: number
  brand_id: number
  name: string
  slug: string
  description: string | null
  created_at: string
}

/** An individual paint with color data. */
export type Paint = {
  id: number
  product_line_id: number
  name: string
  slug: string
  hex: string
  r: number
  g: number
  b: number
  hue: number
  saturation: number
  lightness: number
  is_metallic: boolean
  is_discontinued: boolean
  paint_type: string | null
  created_at: string
  updated_at: string
}

/** A directional reference between two paints (e.g., similar, alternative). */
export type PaintReference = {
  id: number
  paint_id: number
  related_paint_id: number
  relationship: 'similar' | 'alternative' | 'complement'
  similarity_score: number | null
  created_at: string
}
```

#### Affected files

| File | Changes |
|------|---------|
| `src/types/paint.ts` | New — `Brand`, `ProductLine`, `Paint`, `PaintReference` type definitions |

### Step 4: Regenerate Supabase types and verify

1. Start the local Supabase instance (`npm run db:start`) if not already running
2. Reset the database to apply the new migration and seed data (`npm run db:reset`)
3. Regenerate TypeScript types (`npm run db:types`) to produce `src/types/supabase.ts` with the new tables
4. Run `npm run build` and `npm run lint` to verify no errors

#### Affected files

| File | Changes |
|------|---------|
| `src/types/supabase.ts` | Regenerated — includes `brands`, `product_lines`, `paints`, `paint_references` table types |

### Risks & Considerations

- **Hex accuracy**: The `main` branch data has already been compiled with sourced references (see `src/data/REFERENCES.md`). Translucent paints (Contrast, Shade, Speedpaint, Wash, Ink, Xpress Color) and metallic paints have estimated hex values — this is documented and acceptable.
- **HSL computation**: The seed generator must use the standard RGB→HSL algorithm (not approximations) to ensure color wheel mapping works properly. Unit test the conversion with known values.
- **Public SELECT policy**: Unlike the existing `profiles` and `roles` tables (which require authentication), paint data uses truly public access (`anon` + `authenticated`). Verify this works with the Supabase anon key.
- **Seed data size**: 2,337 paints + 334 references produce a large `seed.sql`. This is fine for local dev via `npm run db:reset`. For production, data should be loaded via a separate migration or admin tool.
- **Serial IDs in seed references**: The generator must use subqueries (`SELECT id FROM ... WHERE slug = ...`) instead of hardcoded IDs to stay idempotent across seed reruns.
- **JSON ID mapping for references**: The `comparable` array uses JSON IDs (e.g., `"cit-2"`, `"ap-95"`) which must be mapped to paint slugs. The generator needs a lookup table from JSON ID → slug built during the paint conversion pass.

## Notes

- HSL values are stored denormalized for fast color wheel mapping (hue = angle, lightness = radius).
- The `paint_type` field is brand-specific (Citadel uses Base/Layer/Shade, Vallejo uses Game Color/Model Color, etc.).
- Metallic and discontinued flags enable filtering in the UI.
