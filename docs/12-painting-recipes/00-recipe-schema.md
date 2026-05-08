# Recipe Schema and Module Scaffolding

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Done
**Branch:** `feature/recipe-schema`
**Merge into:** `v1/main`

## Summary

Lay the data foundation for the Painting Recipes epic. Create the relational schema for recipes, ordered steps within sections, paints assigned per step (with technique + instruction), arbitrary notes per step and per recipe, and photos linked to either a recipe or a specific step. Scaffold the `src/modules/recipes/` domain module so subsequent features can plug in without re-litigating schema or shape.

A recipe is a user-owned, optionally public, step-by-step painting guide. Steps are grouped into named sections (e.g., "Base-coating the armour", "Final weathering and varnishing") to mirror the structure of the inspiration page. Each step references zero or more paints via `recipe_step_paints` rows that may optionally point at a palette slot. Notes and photos attach to either a recipe or a specific step.

## Acceptance Criteria

- [x] `recipes` table exists with id, user_id, title, summary, palette_id (nullable), is_public, created_at, updated_at
- [x] `recipe_sections` table exists with id, recipe_id, position, title
- [x] `recipe_steps` table exists with id, section_id, position, title, instructions, technique
- [x] `recipe_step_paints` table links steps to paints with an optional palette slot reference and an ordering position
- [x] `recipe_notes` table holds an arbitrary number of notes attached to either a recipe or a step
- [x] `recipe_photos` table holds an arbitrary number of photos attached to either a recipe or a step (Storage path + URL)
- [x] All tables enable RLS; ownership cascades from the parent recipe
- [x] `is_public` palettes referenced by `palette_id` remain accessible to public viewers; private palettes 404 the recipe view (or hide the palette section) — codified in the service layer
- [x] `updated_at` is maintained by triggers on `recipes`
- [x] `src/modules/recipes/` is scaffolded with `actions/`, `components/`, `services/`, `types/`, `utils/`, `validation.ts`
- [x] Service layer exposes `getRecipeById`, `listRecipesForUser`, `listPublicRecipes`, `createRecipe`, `updateRecipe`, `deleteRecipe`
- [x] Generated Supabase TypeScript types include the new tables
- [x] `npm run build` and `npm run lint` pass with no errors

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

## Implementation Plan

### Overview

This is the foundation for the entire Painting Recipes epic. We ship one Supabase migration that creates six tables (`recipes`, `recipe_sections`, `recipe_steps`, `recipe_step_paints`, `recipe_notes`, `recipe_photos`), associated indexes, RLS policies, the `set_updated_at` trigger on `recipes`, the `recipe-photos` Storage bucket and its policies, and a `replace_recipe_step_paints` RPC that mirrors the existing `replace_palette_paints` pattern for atomic position updates. We also scaffold `src/modules/recipes/` following the Domain Module pattern from `src/modules/palettes/` exactly — three-file service split (`recipe-service.ts` + `.server.ts` + `.client.ts`), one-action-per-file, one-type-per-file, and shared `validation.ts`. No UI ships in this doc; downstream docs depend on the schema and service surface.

### Database changes

Migration file: `supabase/migrations/<ts>_create_recipes_tables.sql` (timestamp must be after `20260425000000_create_palettes_tables.sql` and after Epic 11's `palette_paints.slot_id` migration if that ships separately).

Tables to create (in dependency order):

1. `recipes` — columns per the Database section above; `cover_photo_id` FK is added at the end of the migration to break the circular FK with `recipe_photos`.
2. `recipe_sections` — unique `(recipe_id, position)`.
3. `recipe_steps` — unique `(section_id, position)`.
4. `recipe_step_paints` — unique `(step_id, position)`; FKs to `paints.id` and `palette_paints` (slot ref via composite or via a `slot_id` column on `palette_paints` that Epic 11 ships).
5. `recipe_notes` — XOR check `(recipe_id IS NULL) <> (step_id IS NULL)`.
6. `recipe_photos` — same XOR check; `storage_path` not null.

After all tables exist:

7. `ALTER TABLE recipes ADD CONSTRAINT recipes_cover_photo_id_fkey FOREIGN KEY (cover_photo_id) REFERENCES recipe_photos(id) ON DELETE SET NULL`.

Indexes per the Database section. Trigger: reuse the existing `public.set_updated_at()` function defined in the palettes migration; just install `set_recipes_updated_at` on `UPDATE`. RLS policies follow the palettes migration pattern verbatim (`Owners can view`, `Anyone can view public`, `Users can create their X`, `Owners can update`, `Owners can delete` on the parent; child tables use a `EXISTS` subquery joining up to `recipes`). For deeply nested children (`recipe_step_paints`), introduce a `SECURITY DEFINER` SQL function `is_recipe_owner_via_step(step_id uuid)` so the policy bodies stay short.

RPC: `replace_recipe_step_paints(p_step_id uuid, p_rows jsonb)` — mirror the `replace_palette_paints` body in the existing palettes migration; transactionally delete + reinsert all rows for a step.

Storage:

- `INSERT INTO storage.buckets(id, name, public) VALUES ('recipe-photos', 'recipe-photos', true)` — public so `getPublicUrl` works for public recipes; per-object visibility is enforced by the SELECT policy below.
- Storage policies on `storage.objects` for the `recipe-photos` bucket: SELECT gated by joining `recipe_photos.storage_path` to find the parent recipe and checking `is_public OR auth.uid() = recipes.user_id`; INSERT/UPDATE/DELETE require the path's first segment equals `auth.uid()::text` and the parent recipe is owned by the caller.

### Module changes

| Path | Kind | Purpose |
|------|------|---------|
| `src/modules/recipes/types/recipe.ts` | new | Hydrated `Recipe` type with sections → steps → step-paints + notes + photos arrays |
| `src/modules/recipes/types/recipe-section.ts` | new | `RecipeSection` with ordered `steps` array |
| `src/modules/recipes/types/recipe-step.ts` | new | `RecipeStep` with `stepPaints`, `notes`, `photos` arrays |
| `src/modules/recipes/types/recipe-step-paint.ts` | new | Mirrors `PalettePaint`: includes embedded `paint` (ColorWheelPaint-shaped) plus `paletteSlotId`, `ratio`, `note` |
| `src/modules/recipes/types/recipe-note.ts` | new | `RecipeNote` with parent discriminator |
| `src/modules/recipes/types/recipe-photo.ts` | new | `RecipePhoto` with `storagePath`, dimensions, caption |
| `src/modules/recipes/types/recipe-summary.ts` | new | List-row shape: id, title, coverPhotoUrl, sectionCount, stepCount, paintCount, isPublic, updatedAt, ownerDisplayName? |
| `src/modules/recipes/types/recipe-form-state.ts` | new | `useActionState` shape mirroring `PaletteFormState` |
| `src/modules/recipes/validation.ts` | new | `validateRecipeTitle`, `validateRecipeSummary`, `validateRecipeForm` |
| `src/modules/recipes/services/recipe-service.ts` | new | `createRecipeService(supabase)` factory; exposes `getRecipeById`, `listRecipesForUser`, `listPublicRecipes`, `countPublicRecipes`, `createRecipe`, `updateRecipe`, `deleteRecipe` |
| `src/modules/recipes/services/recipe-service.server.ts` | new | Wrapper that builds the service with `createClient()` from `@/lib/supabase/server` |
| `src/modules/recipes/services/recipe-service.client.ts` | new | Wrapper that builds the service with `createClient()` from `@/lib/supabase/client` |
| `src/modules/recipes/actions/create-recipe.ts` | new | `useActionState`-compatible action; defaults title to "Untitled recipe"; redirects to `/user/recipes/{id}/edit` |
| `src/modules/recipes/actions/update-recipe.ts` | new | Patches `title`, `summary`, `is_public`, `palette_id`, `cover_photo_id`; revalidates `/user/recipes`, `/recipes`, `/recipes/{id}`, `/user/recipes/{id}/edit` |
| `src/modules/recipes/actions/delete-recipe.ts` | new | Deletes the recipe; redirects to `/user/recipes`. Storage cleanup pass is added in 03-recipe-photos. |
| `src/modules/recipes/utils/normalize-recipe-positions.ts` | new | Generic `normalize<T extends { position: number }>(rows): T[]` — reuse for sections, steps, step-paints, notes, photos |
| `src/types/database.types.ts` | modify | Regenerate via `supabase gen types typescript` so the new tables are picked up |

### Route / page changes

None. This doc ships data + service plumbing only.

### Step-by-step ordering

1. Write the migration: tables in dependency order, then circular FK alter, then indexes, then RLS, then `replace_recipe_step_paints` RPC, then Storage bucket + policies. Apply locally and verify with `mcp__supabase-local__list_tables`.
2. Regenerate `src/types/database.types.ts` and confirm the new tables and RPC appear.
3. Add `validation.ts` with `validateRecipeTitle` (1-120 chars), `validateRecipeSummary` (≤5000 chars), and `validateRecipeForm`.
4. Add the eight type files under `types/`. Hydrated `Recipe` mirrors how `Palette` embeds its children but with one extra level of nesting (sections → steps).
5. Add `services/recipe-service.ts` with the factory `createRecipeService(supabase)`. Implement methods one at a time, lifting the patterns from `palette-service.ts`:
   - `getRecipeById(id)` — single nested select `recipes(*, recipe_sections(*, recipe_steps(*, recipe_step_paints(*, paints(*, product_lines(*, brands(*)))))), recipe_notes(*), recipe_photos(*))` then shape into `Recipe`. Sort children by `position` ascending in the mapper.
   - `listRecipesForUser(userId)` — minimal columns, ordered `updated_at desc`.
   - `listPublicRecipes({ limit, offset })` — joins `profiles(display_name)` and computes `paintCount` either via the join or a follow-up `count` RPC; for v1 select the nested chain and count client-side.
   - `countPublicRecipes()` — `head: true` count query, mirroring `countPublicPalettes`.
   - `createRecipe({ userId, title, summary?, isPublic?, paletteId? })` — single insert, returns the row mapped through `Recipe` with empty children arrays.
   - `updateRecipe(id, patch)` — supports the same fields plus `coverPhotoId`.
   - `deleteRecipe(id)` — DB delete only here; Storage cleanup hooks in via 03.
6. Add `services/recipe-service.server.ts` and `recipe-service.client.ts` wrappers (literal copies of the palette equivalents).
7. Add the three top-level recipe actions (`create-recipe.ts`, `update-recipe.ts`, `delete-recipe.ts`). Mirror the auth-check + validate + service-call + revalidate + redirect pattern in `create-palette.ts`.
8. Add `utils/normalize-recipe-positions.ts` — single generic helper used everywhere positions matter.
9. Run `npm run build` and `npm run lint`.

### Risks & considerations

- **Circular FK between `recipes.cover_photo_id` and `recipe_photos.recipe_id`**: must use deferred constraint or two-phase migration (create both tables, then `ALTER TABLE recipes ADD CONSTRAINT … FOREIGN KEY (cover_photo_id) …`). Manual QA: insert a recipe + photo, set cover, delete the photo, confirm `cover_photo_id` becomes null.
- **Polymorphic notes/photos XOR**: schema-level CHECK keeps invalid rows out, but every server action that inserts must pass exactly one of `recipe_id` / `step_id`. The action signatures in 03 and 04 use a discriminated `parent` union to enforce this in TypeScript.
- **RLS for nested children**: the `recipe_step_paints` policies require traversing two parent tables. The `is_recipe_owner_via_step(step_id)` SECURITY DEFINER helper keeps policy bodies readable and avoids subquery duplication.
- **Storage SELECT policy reading from `recipe_photos`**: storage policies can `EXISTS` against application tables — verify with manual QA that the policy passes for public recipes when accessed anonymously.
- **`paint_id` denormalized vs. `palette_slot_id` live join**: the read-path rule lives in the service layer (see 02-recipe-step-paints). Keep this single-source-of-truth in `recipe-service.ts` so the builder and read view never diverge.
- **Hydrated read size**: a deep recipe is one round-trip but possibly 100+ rows. If response sizes exceed ~200KB in QA, split notes/photos into a follow-up query. Don't pre-optimize.
- **Migration ordering with Epic 11**: `palette_slot_id` FK depends on Epic 11's `palette_paints.slot_id` column. If Epic 11 is not landing, drop the FK and keep `palette_slot_id` as a plain `uuid` — annotate that in the migration comment.

### Out of scope

- All recipe UI and routes (handled in 01).
- Storage cleanup logic on cascade delete (handled in 03).
- The `replace_recipe_steps` and `replace_recipe_sections` RPCs (added in 01 if needed; v1 reorder uses `setX` patterns inline).
- Public browse filtering and search (handled in 05).
