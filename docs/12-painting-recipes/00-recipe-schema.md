# Recipe Schema and Module Scaffolding

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-schema`
**Merge into:** `v1/main`

## Summary

Lay the data foundation for the Painting Recipes epic. Create the relational schema for recipes, ordered steps within sections, paints assigned per step (with technique + instruction), arbitrary notes per step and per recipe, and photos linked to either a recipe or a specific step. Scaffold the `src/modules/recipes/` domain module so subsequent features can plug in without re-litigating schema or shape.

A recipe is a user-owned, optionally public, step-by-step painting guide. Steps are grouped into named sections (e.g., "Base-coating the armour", "Final weathering and varnishing") to mirror the structure of the inspiration page. Each step references zero or more paints via `recipe_step_paints` rows that may optionally point at a palette slot. Notes and photos attach to either a recipe or a specific step.

## Acceptance Criteria

- [ ] `recipes` table exists with id, user_id, title, summary, palette_id (nullable), is_public, created_at, updated_at
- [ ] `recipe_sections` table exists with id, recipe_id, position, title
- [ ] `recipe_steps` table exists with id, section_id, position, title, instructions, technique
- [ ] `recipe_step_paints` table links steps to paints with an optional palette slot reference and an ordering position
- [ ] `recipe_notes` table holds an arbitrary number of notes attached to either a recipe or a step
- [ ] `recipe_photos` table holds an arbitrary number of photos attached to either a recipe or a step (Storage path + URL)
- [ ] All tables enable RLS; ownership cascades from the parent recipe
- [ ] `is_public` palettes referenced by `palette_id` remain accessible to public viewers; private palettes 404 the recipe view (or hide the palette section) — codified in the service layer
- [ ] `updated_at` is maintained by triggers on `recipes`
- [ ] `src/modules/recipes/` is scaffolded with `actions/`, `components/`, `services/`, `types/`, `utils/`, `validation.ts`
- [ ] Service layer exposes `getRecipeById`, `listRecipesForUser`, `listPublicRecipes`, `createRecipe`, `updateRecipe`, `deleteRecipe`
- [ ] Generated Supabase TypeScript types include the new tables
- [ ] `npm run build` and `npm run lint` pass with no errors

## Database

### `recipes`

| Column        | Type          | Constraints                                                                  |
| ------------- | ------------- | ---------------------------------------------------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()`                                              |
| `user_id`     | `uuid`        | FK to `profiles.id` on delete cascade, not null                              |
| `palette_id`  | `uuid`        | FK to `palettes.id` on delete set null, nullable                             |
| `title`       | `text`        | Not null, length 1–120                                                       |
| `summary`     | `text`        | Nullable, max length 5000 (markdown allowed)                                 |
| `cover_photo_id` | `uuid`     | FK to `recipe_photos.id` on delete set null, nullable (chosen header photo)  |
| `is_public`   | `boolean`     | Not null, default `false`                                                    |
| `created_at`  | `timestamptz` | Not null, default `now()`                                                    |
| `updated_at`  | `timestamptz` | Not null, default `now()`, maintained by `set_updated_at` trigger            |

### `recipe_sections`

| Column      | Type   | Constraints                                                  |
| ----------- | ------ | ------------------------------------------------------------ |
| `id`        | `uuid` | PK, default `gen_random_uuid()`                              |
| `recipe_id` | `uuid` | FK to `recipes.id` on delete cascade, not null               |
| `position`  | `int`  | Not null, `>= 0`                                             |
| `title`     | `text` | Not null, length 1–120                                       |

Unique on `(recipe_id, position)` to enforce coherent ordering.

### `recipe_steps`

| Column         | Type     | Constraints                                                  |
| -------------- | -------- | ------------------------------------------------------------ |
| `id`           | `uuid`   | PK, default `gen_random_uuid()`                              |
| `section_id`   | `uuid`   | FK to `recipe_sections.id` on delete cascade, not null       |
| `position`     | `int`    | Not null, `>= 0`                                             |
| `title`        | `text`   | Nullable (steps may be unlabeled)                            |
| `technique`    | `text`   | Nullable (free-form, e.g., "stipple", "wet blend")           |
| `instructions` | `text`   | Nullable, max length 5000 (markdown allowed)                 |

Unique on `(section_id, position)`.

### `recipe_step_paints`

| Column            | Type     | Constraints                                                  |
| ----------------- | -------- | ------------------------------------------------------------ |
| `id`              | `uuid`   | PK, default `gen_random_uuid()`                              |
| `step_id`         | `uuid`   | FK to `recipe_steps.id` on delete cascade, not null          |
| `position`        | `int`    | Not null, `>= 0`                                             |
| `paint_id`        | `uuid`   | FK to `paints.id` on delete cascade, not null                |
| `palette_slot_id` | `uuid`   | FK to `palette_paints.slot_id` on delete set null, nullable  |
| `ratio`           | `text`   | Nullable, free-form (e.g., "50/50 with Lahmian Medium")      |
| `note`            | `text`   | Nullable, max length 500                                     |

Unique on `(step_id, position)`.

`palette_slot_id` lets a step reference a paint that came from the recipe's palette specifically — useful for "swap palette → all steps update" later. The `paint_id` is denormalized so a step can show its paint even if the palette slot was deleted; if both are present they should agree (enforced in app code on insert/update).

### `recipe_notes`

| Column       | Type          | Constraints                                                       |
| ------------ | ------------- | ----------------------------------------------------------------- |
| `id`         | `uuid`        | PK, default `gen_random_uuid()`                                   |
| `recipe_id`  | `uuid`        | FK to `recipes.id` on delete cascade, nullable                    |
| `step_id`    | `uuid`        | FK to `recipe_steps.id` on delete cascade, nullable               |
| `position`   | `int`         | Not null, `>= 0` (order within parent)                            |
| `body`       | `text`        | Not null, max length 5000 (markdown allowed)                      |
| `created_at` | `timestamptz` | Not null, default `now()`                                         |

CHECK: exactly one of `recipe_id` and `step_id` is non-null. (`recipe_id IS NOT NULL <> step_id IS NOT NULL` — both being present is invalid; both being null is invalid.)

### `recipe_photos`

| Column         | Type          | Constraints                                                                  |
| -------------- | ------------- | ---------------------------------------------------------------------------- |
| `id`           | `uuid`        | PK, default `gen_random_uuid()`                                              |
| `recipe_id`    | `uuid`        | FK to `recipes.id` on delete cascade, nullable                               |
| `step_id`      | `uuid`        | FK to `recipe_steps.id` on delete cascade, nullable                          |
| `position`     | `int`         | Not null, `>= 0` (order within parent)                                       |
| `storage_path` | `text`        | Not null (path inside the `recipe-photos` bucket)                            |
| `width_px`     | `int`         | Nullable                                                                     |
| `height_px`    | `int`         | Nullable                                                                     |
| `caption`      | `text`        | Nullable, max length 200                                                     |
| `created_at`   | `timestamptz` | Not null, default `now()`                                                    |

CHECK: exactly one of `recipe_id` and `step_id` is non-null. The chosen `cover_photo_id` on `recipes` must reference a row whose `recipe_id` equals the parent recipe — enforced in app code.

### Indexes

- `idx_recipes_user_id` on `(user_id)`
- `idx_recipes_public_updated` on `(is_public, updated_at desc)` where `is_public = true` — drives the public browse list
- `idx_recipe_sections_recipe` on `(recipe_id)`
- `idx_recipe_steps_section` on `(section_id)`
- `idx_recipe_step_paints_step` on `(step_id)`
- `idx_recipe_step_paints_paint` on `(paint_id)` — reverse lookup for "recipes using this paint"
- `idx_recipe_notes_recipe` on `(recipe_id)` (partial: `recipe_id IS NOT NULL`)
- `idx_recipe_notes_step` on `(step_id)` (partial: `step_id IS NOT NULL`)
- `idx_recipe_photos_recipe` on `(recipe_id)` (partial)
- `idx_recipe_photos_step` on `(step_id)` (partial)

### Row Level Security

`recipes`:

- **SELECT**: owners or `is_public = true`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE / DELETE**: owners only

Children (`recipe_sections`, `recipe_steps`, `recipe_step_paints`, `recipe_notes`, `recipe_photos`):

- **SELECT**: visible iff the parent recipe is visible (use `EXISTS` against `recipes`)
- **INSERT / UPDATE / DELETE**: only when the caller owns the parent recipe

For nested children (e.g., `recipe_step_paints`), join up through `recipe_steps` → `recipe_sections` → `recipes`. Wrap the join chain in a `SECURITY DEFINER` SQL function `is_recipe_owner(parent_id uuid)` if the policy SQL gets unwieldy.

### Storage bucket: `recipe-photos`

- Bucket name: `recipe-photos`
- Public read on objects whose corresponding `recipe_photos` row links to a public recipe (enforced via storage policy referencing `recipe_photos`)
- Authenticated write only when the caller owns the parent recipe
- Object path convention: `{user_id}/{recipe_id}/{photo_id}.{ext}`

The bucket and storage policies ship in this migration so `03-recipe-photos.md` doesn't have to redo it.

## Domain Module

```
src/modules/recipes/
├── actions/
│   ├── create-recipe.ts
│   ├── update-recipe.ts
│   └── delete-recipe.ts
├── components/                       (filled in by 01-recipe-builder)
├── services/
│   ├── recipe-service.ts             (shared shape, no client directly)
│   ├── recipe-service.server.ts
│   └── recipe-service.client.ts
├── types/
│   ├── recipe.ts                     (hydrated: sections + steps + paints)
│   ├── recipe-section.ts
│   ├── recipe-step.ts
│   ├── recipe-step-paint.ts
│   ├── recipe-note.ts
│   ├── recipe-photo.ts
│   ├── recipe-summary.ts             (lightweight list-row shape)
│   └── recipe-form-state.ts
├── utils/
│   └── normalize-recipe-positions.ts (renumbers section/step/note/photo positions)
└── validation.ts                     (validators for title, summary, etc.)
```

## Key Files

| Action | File                                                                  | Description                                              |
| ------ | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Create | `supabase/migrations/{ts}_create_recipes_tables.sql`                  | All tables, indexes, RLS, storage bucket + policies      |
| Create | `src/modules/recipes/types/*.ts`                                      | One type per file per `CLAUDE.md`                        |
| Create | `src/modules/recipes/validation.ts`                                   | `validateRecipeTitle`, `validateRecipeSummary`           |
| Create | `src/modules/recipes/services/recipe-service.ts`                      | Hydrated reads + atomic writes                           |
| Create | `src/modules/recipes/services/recipe-service.server.ts`               | Server entry                                             |
| Create | `src/modules/recipes/services/recipe-service.client.ts`               | Browser entry                                            |
| Create | `src/modules/recipes/actions/create-recipe.ts`                        | Empty recipe stub; redirects to edit                     |
| Create | `src/modules/recipes/actions/update-recipe.ts`                        | Updates title/summary/visibility/palette_id              |
| Create | `src/modules/recipes/actions/delete-recipe.ts`                        | Cascades delete                                          |
| Create | `src/modules/recipes/utils/normalize-recipe-positions.ts`             | Single owner of "renumber children to 0..N-1"            |
| Modify | `src/types/database.types.ts` (regenerated)                           | Picks up the new tables                                  |

## Implementation

### 1. Migration

Single migration creates all six tables in dependency order, then indexes, then RLS, then the storage bucket + policies. Key gotchas:

- The `cover_photo_id` FK on `recipes` references `recipe_photos`, which references `recipes` — circular. Resolve by creating both tables, then adding the `cover_photo_id` FK in a separate `ALTER TABLE` near the end of the migration.
- The storage policies must be installed in the same migration; otherwise the photo feature can't ship without re-running.

### 2. Regenerate types

Run the project's typegen and verify each new table appears in `database.types.ts`.

### 3. Service layer

`recipe-service.ts` exposes:

- `getRecipeById(client, id)` → fully-hydrated `Recipe` (sections → steps → step_paints, plus notes and photos), respecting RLS
- `listRecipesForUser(client, userId)` → `RecipeSummary[]` (id, title, cover_photo_url, step_count, updated_at)
- `listPublicRecipes(client, opts)` → paginated `RecipeSummary[]`, sorted `updated_at desc`
- `createRecipe(client, { userId, title })` → `Recipe`
- `updateRecipe(client, id, patch)` → updated `Recipe`
- `deleteRecipe(client, id)` → `void` (cascades to all children + storage objects via a Storage cleanup pass — see `03-recipe-photos`)

The hydrated read is one query that joins the whole tree. Use Supabase's nested select syntax (`recipes(*, recipe_sections(*, recipe_steps(*, recipe_step_paints(*))), recipe_notes(*), recipe_photos(*))`) and shape into the `Recipe` type in `recipe-service.ts`. The mapping function lives next to the query so both stay close.

### 4. Actions

- `createRecipe` — uses `useActionState`; default title "Untitled recipe", redirects to `/recipes/{id}/edit`
- `updateRecipe` — title, summary, palette_id, is_public, cover_photo_id; revalidates `/recipes/{id}` and `/recipes/{id}/edit`
- `deleteRecipe` — confirms, deletes, redirects to `/recipes`

### 5. Validation

- `validateRecipeTitle(title)` — required, trimmed, 1–120 chars
- `validateRecipeSummary(summary)` — optional, 0–5000 chars

`validateRecipeForm(input)` returns a `RecipeFormState`.

## Risks & Considerations

- **Polymorphic notes/photos (recipe vs step parent)**: The XOR check ensures a row attaches to exactly one parent. The query layer can fan out by parent type. Consider materializing a `parent_type` enum if the XOR check ever feels noisy in policies.
- **Circular FK** (`recipes.cover_photo_id` ↔ `recipe_photos.recipe_id`): Resolved by creating tables first, then adding the FK. Document in the migration.
- **Storage policies tied to row visibility**: Public-read on the bucket is gated by joining to `recipe_photos` and checking the parent recipe's `is_public`. The Supabase storage policy can do this with a `SELECT EXISTS` subquery; verify with manual QA after migration.
- **`palette_slot_id` lifecycle**: When a palette slot is deleted, set the FK to null but keep the `paint_id` so the step still renders the paint. This matches the user mental model — "the recipe still shows what paint I used, even if I deleted the palette."
- **Bucket policy ordering**: Storage policies must be created after the `recipe_photos` table exists. Keep them at the end of the migration.
- **Public visibility of palette referenced by a public recipe**: If a recipe is public but its referenced palette is private, the recipe view shouldn't reveal palette-only details. The hydrated read in the service layer should check palette visibility at fetch time and either omit the palette block or surface it as "Palette is private."
- **Hydrated read size**: Fully hydrating a recipe with many sections, steps, paints, notes, and photos is several JSON paths in one query. For deep recipes this is still a single round-trip but can grow; if response sizes ever cross ~200kb, split notes/photos into a follow-up query.

## Notes

- This feature ships data + plumbing only; user-visible recipe UI lands in `01-recipe-builder` and downstream features.
- Migration timestamp must come after the most recent migration (latest in tree at time of writing: `20260424000000_admin_user_paints_policies.sql`) and after any palette-epic migration that ships first. The `palette_slot_id` FK requires `palette_paints.slot_id` to exist — sequence Epic 11's migrations before this one.
