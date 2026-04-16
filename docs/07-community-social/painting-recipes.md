# Painting Recipes (Step-by-Step Color Layering Guides)

**Epic:** Community & Social
**Type:** Feature
**Status:** Todo
**Branch:** `feature/painting-recipes`
**Merge into:** `v1/main`

## Summary

Allow users to create and share painting recipes — step-by-step guides that describe how to achieve a specific color effect by layering paints in sequence (e.g., base coat, shade, layer, highlight).

## Acceptance Criteria

- [ ] Authenticated users can create a painting recipe
- [ ] Recipes include a title, description, and ordered list of steps
- [ ] Each step references a specific paint and describes the technique (base, wash, drybrush, layer, etc.)
- [ ] Recipes can optionally include a cover image
- [ ] Recipes are publicly viewable
- [ ] Users can edit and delete their own recipes
- [ ] Recipes display all referenced paints with color swatches
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                | Description                         |
| -------------------- | ----------------------------------- |
| `/recipes`           | Browse all recipes                  |
| `/recipes/[id]`      | View a single recipe                |
| `/recipes/new`       | Create a new recipe (auth required) |
| `/recipes/[id]/edit` | Edit own recipe (auth required)     |

## Database

### `recipes` Table

| Column            | Type          | Constraints                   |
| ----------------- | ------------- | ----------------------------- |
| `id`              | `serial`      | Primary key                   |
| `user_id`         | `uuid`        | FK to `profiles.id`, not null |
| `title`           | `text`        | Not null                      |
| `description`     | `text`        | Nullable                      |
| `cover_image_url` | `text`        | Nullable                      |
| `created_at`      | `timestamptz` | Not null, default `now()`     |
| `updated_at`      | `timestamptz` | Not null, default `now()`     |

### `recipe_steps` Table

| Column         | Type     | Constraints                                                  |
| -------------- | -------- | ------------------------------------------------------------ |
| `id`           | `serial` | Primary key                                                  |
| `recipe_id`    | `int`    | FK to `recipes.id` on delete cascade                         |
| `step_order`   | `int`    | Not null                                                     |
| `paint_id`     | `int`    | FK to `paints.id`, nullable                                  |
| `technique`    | `text`   | Not null (e.g., base, wash, drybrush, layer, edge highlight) |
| `instructions` | `text`   | Not null                                                     |

### Row Level Security

- **SELECT**: Public read access
- **INSERT**: Authenticated users can create recipes (`auth.uid() = user_id`)
- **UPDATE / DELETE**: Users can modify their own recipes (`auth.uid() = user_id`)

## Implementation

### 1. Recipe creation form

A multi-step form where users add a title, description, and ordered steps. Each step has a paint picker, technique selector, and instruction text area. Steps can be reordered via drag-and-drop.

### 2. Recipe display page

Shows the recipe with all steps in order. Each step shows the paint swatch, technique badge, and instructions. Referenced paints link to their detail views.

### 3. Recipe browsing

A paginated grid of recipe cards with title, author, and step count. Filterable by technique or paint.

## Notes

- Recipes are a core community feature — they capture and share painting knowledge.
- Consider allowing recipes to reference paints not in the database (custom mixes) via a freeform color input.
- Image upload for cover photos could use Supabase Storage.
