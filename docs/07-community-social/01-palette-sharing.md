# Curated Palette Sharing

**Epic:** Community & Social
**Type:** Feature
**Status:** Todo
**Branch:** `feature/palette-sharing`
**Merge into:** `v1/main`

## Summary

Allow users to create, save, and share curated color palettes — named collections of paints grouped for a specific purpose (e.g., "Space Marines Ultramarines", "Autumn Forest Basing").

## Acceptance Criteria

- [ ] Authenticated users can create a named palette
- [ ] Palettes contain an ordered list of paints
- [ ] Users can add paints to a palette from any paint detail view
- [ ] Palettes are publicly viewable and shareable via URL
- [ ] Users can edit and delete their own palettes
- [ ] Palette view shows all paints as a color strip with details
- [ ] Palettes generated from the Color Scheme Explorer can be saved directly
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                 | Description                          |
| --------------------- | ------------------------------------ |
| `/palettes`           | Browse all public palettes           |
| `/palettes/[id]`      | View a single palette                |
| `/palettes/new`       | Create a new palette (auth required) |
| `/palettes/[id]/edit` | Edit own palette (auth required)     |

## Database

### `palettes` Table

| Column        | Type          | Constraints                   |
| ------------- | ------------- | ----------------------------- |
| `id`          | `serial`      | Primary key                   |
| `user_id`     | `uuid`        | FK to `profiles.id`, not null |
| `name`        | `text`        | Not null                      |
| `description` | `text`        | Nullable                      |
| `created_at`  | `timestamptz` | Not null, default `now()`     |
| `updated_at`  | `timestamptz` | Not null, default `now()`     |

### `palette_paints` Table

| Column       | Type  | Constraints                                                 |
| ------------ | ----- | ----------------------------------------------------------- |
| `palette_id` | `int` | FK to `palettes.id` on delete cascade, part of composite PK |
| `paint_id`   | `int` | FK to `paints.id`, part of composite PK                     |
| `sort_order` | `int` | Not null                                                    |

### Row Level Security

- **SELECT**: Public read access
- **INSERT**: Authenticated users (`auth.uid() = user_id`)
- **UPDATE / DELETE**: Own palettes only (`auth.uid() = user_id`)

## Implementation

### 1. Palette creation

A form with palette name, description, and a paint picker to add paints. Paints can be reordered via drag-and-drop.

### 2. Palette display

A page showing the palette as a horizontal color strip (swatches in order) with a list below showing paint details. Shareable via URL.

### 3. "Save as palette" integration

The Color Scheme Explorer's "save as palette" action creates a new palette pre-populated with the suggested paints from a scheme.

### 4. Add to palette from paint detail

A dropdown or modal on paint detail views allows adding the paint to an existing palette or creating a new one.

## Notes

- Palettes differ from recipes: palettes are unordered color collections, recipes are ordered step-by-step guides.
- Popular palettes could be featured on the community feed.
- Consider allowing palettes to include custom hex colors (not just database paints).
