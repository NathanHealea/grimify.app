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
- [ ] Seed data covers at least 3 major brands (e.g., Citadel, Vallejo, Army Painter)
- [ ] Each paint has accurate hex color values
- [ ] RLS policies allow all users to read paint data
- [ ] Only admins can insert/update/delete paint data
- [ ] `npm run build` and `npm run lint` pass with no errors

## Database

### `brands` Table

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | Primary key |
| `name` | `text` | Unique, not null |
| `slug` | `text` | Unique, not null |
| `website_url` | `text` | Nullable |
| `logo_url` | `text` | Nullable |
| `created_at` | `timestamptz` | Not null, default `now()` |

### `product_lines` Table

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | Primary key |
| `brand_id` | `int` | FK to `brands.id`, not null |
| `name` | `text` | Not null |
| `slug` | `text` | Not null |
| `description` | `text` | Nullable |
| `created_at` | `timestamptz` | Not null, default `now()` |

Unique constraint on `(brand_id, slug)`.

### `paints` Table

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | Primary key |
| `product_line_id` | `int` | FK to `product_lines.id`, not null |
| `name` | `text` | Not null |
| `slug` | `text` | Not null |
| `hex` | `text` | Not null (e.g., `#FF5733`) |
| `r` | `int` | Not null (0-255) |
| `g` | `int` | Not null (0-255) |
| `b` | `int` | Not null (0-255) |
| `hue` | `float` | Not null (0-360) |
| `saturation` | `float` | Not null (0-100) |
| `lightness` | `float` | Not null (0-100) |
| `is_metallic` | `boolean` | Not null, default `false` |
| `is_discontinued` | `boolean` | Not null, default `false` |
| `paint_type` | `text` | Nullable (e.g., base, layer, shade, contrast, technical) |
| `created_at` | `timestamptz` | Not null, default `now()` |
| `updated_at` | `timestamptz` | Not null, default `now()` |

Unique constraint on `(product_line_id, slug)`.

### Row Level Security

All three tables:
- **SELECT**: Public read access (no auth required — paint data is browsable by everyone)
- **INSERT / UPDATE / DELETE**: Only admin role users

## Implementation

### 1. Database migration

Create a migration that sets up all three tables, indexes, and RLS policies.

### 2. TypeScript types

Create types in `src/types/paint.ts` for `Brand`, `ProductLine`, and `Paint`.

### 3. Seed data

Create seed scripts or migration inserts for at least 3 major miniature paint brands with their product lines and individual paints. Compute HSL values from hex during seeding.

## Notes

- HSL values are stored denormalized for fast color wheel mapping (hue = angle, lightness = radius).
- The `paint_type` field is brand-specific (Citadel uses Base/Layer/Shade, Vallejo uses Game Color/Model Color, etc.).
- Metallic and discontinued flags enable filtering in the UI.
