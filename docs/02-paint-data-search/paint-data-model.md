# Paint Data Model and Seed Data

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo

## Summary

Design and implement the core database schema for storing miniature paint data across multiple brands and product lines. Seed the database with paint data from major manufacturers.

## Acceptance Criteria

- [ ] A `brands` table exists with manufacturer information
- [ ] A `product_lines` table exists linking paint ranges to brands
- [ ] A `paints` table exists with color data (name, hex, RGB, HSL values)
- [ ] A `paint_references` table exists linking related paints with relationship type and similarity score
- [ ] Seed data covers at least 3 major brands (e.g., Citadel, Vallejo, Army Painter)
- [ ] Each paint has accurate hex color values
- [ ] RLS policies allow all users to read paint data
- [ ] Only admins can insert/update/delete paint data
- [ ] `npm run build` and `npm run lint` pass with no errors

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

### Step 2: Seed data

Populate `supabase/seed.sql` with paint data for at least 3 major miniature paint brands. Each brand gets its product lines and individual paints with accurate hex values and pre-computed RGB/HSL values.

#### Brands to seed

| Brand | Website | Product Lines |
|-------|---------|---------------|
| **Citadel** (Games Workshop) | `https://www.games-workshop.com` | Base, Layer, Shade, Dry, Contrast, Technical |
| **Vallejo** | `https://acrylicosvallejo.com` | Game Color, Model Color, Game Air, Metal Color |
| **The Army Painter** | `https://thearmypainter.com` | Warpaints, Warpaints Fanatic, Speedpaint |

#### Data approach

Write SQL `INSERT` statements directly in `seed.sql`. Use a helper comment block to document the hex→RGB→HSL conversion formula. Seed a representative set of paints per product line (at minimum the most commonly used paints — approximately 20-40 paints per brand to cover the core palette). Each paint must include:

- Accurate hex value (sourced from manufacturer specifications)
- RGB values derived from hex
- HSL values computed from RGB (hue 0-360, saturation 0-100, lightness 0-100)
- Correct `paint_type` for the product line
- `is_metallic` flag set for metallic/gold/silver/copper paints
- `is_discontinued` flag set for paints no longer in production

#### Seed data structure

```sql
-- Brands
INSERT INTO public.brands (name, slug, website_url) VALUES
  ('Citadel', 'citadel', 'https://www.games-workshop.com'),
  ('Vallejo', 'vallejo', 'https://acrylicosvallejo.com'),
  ('The Army Painter', 'the-army-painter', 'https://thearmypainter.com');

-- Product lines (reference brand IDs via subquery)
INSERT INTO public.product_lines (brand_id, name, slug, description) VALUES
  ((SELECT id FROM public.brands WHERE slug = 'citadel'), 'Base', 'base', 'High-pigment foundation paints'),
  ...;

-- Paints (reference product_line IDs via subquery)
INSERT INTO public.paints (product_line_id, name, slug, hex, r, g, b, hue, saturation, lightness, is_metallic, paint_type) VALUES
  ((SELECT id FROM public.product_lines WHERE slug = 'base' AND brand_id = (SELECT id FROM public.brands WHERE slug = 'citadel')),
   'Abaddon Black', 'abaddon-black', '#231F20', 35, 31, 32, 345, 6, 13, false, 'base'),
  ...;

-- Paint references (cross-brand similarities and alternatives)
INSERT INTO public.paint_references (paint_id, related_paint_id, relationship, similarity_score) VALUES
  ((SELECT id FROM public.paints WHERE slug = 'averland-sunset'),
   (SELECT id FROM public.paints WHERE slug = 'moon-yellow-76005'),
   'similar', 97.2),
  ...;
```

#### Affected files

| File | Changes |
|------|---------|
| `supabase/seed.sql` | Replace placeholder comment with full seed data |

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

- **Hex accuracy**: Paint hex values must be sourced from reliable references. Inaccurate colors undermine the core feature. Cross-reference manufacturer swatches where possible.
- **HSL computation**: Must be computed correctly from RGB. Use the standard algorithm (not approximations) to ensure color wheel mapping works properly.
- **Public SELECT policy**: Unlike the existing `profiles` and `roles` tables (which require authentication), paint data uses truly public access (`anon` + `authenticated`). Verify this works with the Supabase anon key.
- **Seed data size**: Large INSERT statements in `seed.sql` are fine for local dev. For production, the migration itself creates empty tables and seed data would be loaded separately (e.g., via an admin tool or a separate migration).
- **Serial IDs in seed references**: Use subqueries (`SELECT id FROM ... WHERE slug = ...`) instead of hardcoded IDs to avoid fragile references across seed reruns.

## Notes

- HSL values are stored denormalized for fast color wheel mapping (hue = angle, lightness = radius).
- The `paint_type` field is brand-specific (Citadel uses Base/Layer/Shade, Vallejo uses Game Color/Model Color, etc.).
- Metallic and discontinued flags enable filtering in the UI.
