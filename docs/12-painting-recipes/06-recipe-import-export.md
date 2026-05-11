# Recipe Import / Export

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-import-export`
**Merge into:** `main`

## Summary

Let users export a single recipe — or all of their recipes in bulk — as portable JSON documents and import those documents back into Grimify (their own account, or — for admins — any user's account). Exports capture the recipe's structure (sections, steps, step paints, notes), referenced paints by stable cross-brand identifiers, and optional palette linkage. **Photos are omitted in v1** (Variant C below) — the importer never touches Storage. Imports validate against a versioned schema, resolve paint references against the curated catalog via the shared resolver in `src/modules/paints/`, and recreate the recipe and all child rows transactionally.

The user-facing flow is: from `/recipes/[id]` (when the recipe is owned), an "Export" action downloads `{recipe-slug}.grimify-recipe.json`. From `/user/recipes` an "Import recipe" action accepts a JSON document (file picker **or** paste textarea) and creates a new recipe under the current user; an "Export all" action downloads a ZIP of every owned recipe.

The admin flow mirrors this on the admin recipes surface — `/admin/users/[id]/recipes` exposes per-recipe export, bulk export of all of the target user's recipes, single-recipe import, and bulk import (ZIP). All admin actions require an admin-supplied free-text reason that is persisted to `admin_audit_log` (see "Admin audit log" section). Self-protection: an admin acting on their own account is rejected and steered to the user surfaces (matches the pattern in `08-user-management/06-collection-management.md`).

This feature ships **after** `00-recipe-schema.md` (which scaffolds `src/modules/recipes/`) and **after** the sibling `11-color-palettes/12-palette-import-export.md` (which introduces the shared paint-reference resolver and the `admin_audit_log` table). It does **not** depend on `03-recipe-photos.md` for v1 — Variant C means we never read from or write to Storage. A future v2 that ships portable photos would add that dependency. It does not depend on `05-recipe-sharing.md`.

## Acceptance Criteria

### User flows

- [ ] `/recipes/[id]` shows an "Export" button visible only to the recipe owner; click triggers a JSON download named `{slugified-title}.grimify-recipe.json`. The button also exposes a "Copy JSON" secondary action.
- [ ] `/user/recipes` shows an "Import recipe" button that opens a dialog with a tab-style toggle between **File** (picker accepting `.json`) and **Paste** (textarea); both paths submit through the same import action
- [ ] `/user/recipes` shows an "Export all" button that triggers a ZIP download (`grimify-recipes-{YYYY-MM-DD}.zip`) containing one `*.grimify-recipe.json` per owned recipe plus a `manifest.json` listing them
- [ ] `/user/recipes` shows an "Import recipes" (bulk) button that accepts a `.zip` file and runs the single-import flow per file, surfacing a per-file result table
- [ ] Import dialog shows a per-paint resolution preview before commit (matched / fallback / unresolved counts)
- [ ] On successful single-recipe import, redirect to `/recipes/[newId]` and show a toast summarizing matched + fallback + unresolved counts
- [ ] On import failure (schema invalid, version unsupported, all paints unresolved with no fallback policy enabled), the dialog surfaces a list of human-readable errors and does not create any rows
- [ ] Imported recipes are owned by the importing user, default `is_public = false`, and use `now()` for `created_at` / `updated_at` (the original timestamps are recorded inside the export `source` block but never trusted for the new row)
- [ ] Imported recipes record the source recipe's id in a new `recipes.origin_recipe_id` column; if a row with that origin id already exists for the importing user, the dialog defaults to **Skip** with an explicit "Import as a new copy" override (see "Idempotency" section)
- [ ] If the export references a `palette_id`, the importer attempts to resolve it against palettes the importing user owns (by `originPaletteId` first, then by exact name match); on no match, `palette_id` is set to `null` and a warning is surfaced

### Admin flows

- [ ] `/admin/users/[id]/recipes` shows per-row Export, an "Export all" (bulk) button, an "Import on behalf of {user}" button, and an "Import recipes (ZIP)" bulk button
- [ ] Admin import creates the recipe(s) under the targeted user, **not** the admin
- [ ] Admin actions reject `userId === auth.uid()` ("Use your own surface") to prevent destructive self-edits
- [ ] Admin export and import are gated by an `'admin' = ANY(public.get_user_roles(auth.uid()))` check inside the server action
- [ ] Every admin action — single export, bulk export, single import, bulk import — requires a free-text reason (≥ 8 non-whitespace chars) captured in the dialog and persisted to `admin_audit_log` with the appropriate `action_kind` (`recipe.export`, `recipe.bulk-export`, `recipe.import`, `recipe.bulk-import`)

### Cross-cutting

- [ ] Schema is `schemaVersion: "grimify.recipe.v1"` — a closed string-literal discriminator
- [ ] Forward compatibility: importer rejects unknown `schemaVersion` values with a clear "Unsupported version" error rather than guessing
- [ ] All paint references include enough redundant data to survive a paint-id change (id + brand name + product line name + paint name + hex)
- [ ] Resolution policy: id → `(brandName, productLineName, paintName)` triple → `(hex, brandName, paintName)` fallback. The importer never inserts new `paints`, `brands`, or `product_lines` rows — the catalog is curated
- [ ] All inserts run under a single transaction (or compensating delete on partial failure) — there are no partially-imported recipes
- [ ] **Photos are omitted from exports in v1** (Variant C); `photos: []` everywhere, `coverPhotoLocalId: null`. The importer never reads from or writes to the `recipe-photos` bucket.
- [ ] The cross-reference resolver lives at `src/modules/paints/utils/resolve-paint-references.ts` and is the single shared implementation used by both palette and recipe imports
- [ ] Exports are **not** signed or checksummed — users are explicitly allowed to edit the JSON outside the app
- [ ] `npm run build` and `npm run lint` pass with no errors

## JSON schema

### Top-level document

| Field           | Type                              | Required | Description                                                                                |
| --------------- | --------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `schemaVersion` | `"grimify.recipe.v1"`             | yes      | Closed discriminator. Bumped on breaking changes; the importer matches on exact value.     |
| `kind`          | `"recipe"`                        | yes      | Document kind tag — guards against importing a palette doc into the recipe importer.       |
| `exportedAt`    | `string` (ISO 8601 UTC)           | yes      | When the export was generated.                                                             |
| `source`        | `RecipeSourceMetadata`            | yes      | Provenance — see below.                                                                    |
| `recipe`        | `RecipeExport`                    | yes      | The recipe payload — see below.                                                            |

### `RecipeSourceMetadata`

| Field                  | Type            | Required | Description                                                                                       |
| ---------------------- | --------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `app`                  | `"grimify"`     | yes      | Origin marker.                                                                                    |
| `appVersion`           | `string`        | yes      | Semver of the running app at export time (read from `package.json` at build time).                |
| `originRecipeId`       | `string` (uuid) | yes      | The originating recipe id — used by the importer for "import the same recipe twice" idempotency. |
| `originPaletteId`      | `string` (uuid) | no       | If the recipe was linked to a palette, the original palette id — used to resolve linkage.        |
| `originUserId`         | `string` (uuid) | no       | The exporting user's id — informational only; not trusted for ownership.                         |

### `RecipeExport`

| Field         | Type                          | Required | Description                                                                                |
| ------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `title`       | `string` (1–120)              | yes      | Recipe title.                                                                              |
| `summary`     | `string \| null` (≤ 5000)     | yes      | Markdown-allowed summary; `null` when not set.                                             |
| `isPublic`    | `boolean`                     | yes      | Original visibility. The importer **does not** copy this — imported recipes default `false` and the value is informational. |
| `createdAt`   | `string` (ISO 8601)           | yes      | Original creation timestamp — informational; the new row uses `now()`.                     |
| `updatedAt`   | `string` (ISO 8601)           | yes      | Original update timestamp — informational; the new row uses `now()`.                       |
| `paletteRef`  | `PaletteReference \| null`    | yes      | If the recipe was linked to a palette, the linkage descriptor; otherwise `null`.           |
| `coverPhotoLocalId` | `null`                  | yes      | Reserved. Always `null` in v1 (Variant C). Future variants may set a `localId`.            |
| `sections`    | `SectionExport[]`             | yes      | Ordered sections; sorted by `position` ascending.                                          |
| `notes`       | `RecipeNoteExport[]`          | yes      | Recipe-level notes (those whose `recipe_id` is set); ordered by `position`.                |
| `photos`      | `RecipePhotoExport[]`         | yes      | Reserved. **Always `[]` in v1** (Variant C). The importer rejects v1 documents with non-empty `photos`. |

### `SectionExport`

| Field      | Type                | Required | Description                                                                            |
| ---------- | ------------------- | -------- | -------------------------------------------------------------------------------------- |
| `localId`  | `string`            | yes      | Stable identifier for cross-references inside this document (e.g., `"section-0"`).     |
| `title`    | `string` (1–120)    | yes      | Section title.                                                                         |
| `position` | `int` (`>= 0`)      | yes      | Position within the recipe.                                                            |
| `steps`    | `StepExport[]`      | yes      | Ordered steps within this section.                                                     |

### `StepExport`

| Field          | Type                       | Required | Description                                                                            |
| -------------- | -------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `localId`      | `string`                   | yes      | Stable id for note/photo cross-references (e.g., `"section-0-step-0"`).                |
| `position`     | `int` (`>= 0`)             | yes      | Position within the section.                                                           |
| `title`        | `string \| null`           | yes      | Step title; nullable.                                                                  |
| `technique`    | `string \| null`           | yes      | Free-form technique label.                                                             |
| `instructions` | `string \| null` (≤ 5000)  | yes      | Markdown-allowed instructions.                                                         |
| `paints`       | `StepPaintExport[]`        | yes      | Paints used in this step, ordered by `position`.                                       |
| `notes`        | `RecipeNoteExport[]`       | yes      | Step-level notes (those whose `step_id` matches this step), ordered by `position`.     |
| `photos`       | `RecipePhotoExport[]`      | yes      | Reserved. **Always `[]` in v1** (Variant C).                                            |

### `StepPaintExport`

| Field             | Type                       | Required | Description                                                                       |
| ----------------- | -------------------------- | -------- | --------------------------------------------------------------------------------- |
| `position`        | `int` (`>= 0`)             | yes      | Position within the step.                                                         |
| `paint`           | `PaintReference`           | yes      | Paint cross-reference — see below.                                                |
| `paletteSlotRef`  | `PaletteSlotReference \| null` | yes  | If the step paint pointed at a palette slot, the descriptor; otherwise `null`.    |
| `ratio`           | `string \| null`           | yes      | Free-form ratio/medium ("50/50 with Lahmian Medium"); nullable.                   |
| `note`            | `string \| null` (≤ 500)   | yes      | Free-form note specific to this paint use.                                        |

### `PaintReference`

Embedded redundantly so that paint-id changes don't break imports.

| Field             | Type             | Required | Description                                                                |
| ----------------- | ---------------- | -------- | -------------------------------------------------------------------------- |
| `id`              | `string` (uuid)  | yes      | Source paint id; primary lookup key.                                       |
| `name`            | `string`         | yes      | Paint display name.                                                        |
| `hex`             | `string`         | yes      | Hex color (e.g., `#A02020`).                                               |
| `brandName`       | `string`         | yes      | Owning brand display name.                                                 |
| `productLineName` | `string \| null` | yes      | Product line display name; `null` when the paint has no line.              |
| `paintType`       | `string \| null` | yes      | Type code (e.g., `"layer"`, `"base"`); informational.                      |
| `isMetallic`      | `boolean`        | yes      | Informational; aids debugging when paints are renamed.                     |

### `PaletteReference`

| Field             | Type             | Required | Description                                                                |
| ----------------- | ---------------- | -------- | -------------------------------------------------------------------------- |
| `originPaletteId` | `string` (uuid)  | yes      | Source palette id; primary lookup against the importing user's palettes.   |
| `name`            | `string`         | yes      | Palette display name; secondary lookup key.                                |

### `PaletteSlotReference`

| Field             | Type             | Required | Description                                                                |
| ----------------- | ---------------- | -------- | -------------------------------------------------------------------------- |
| `originSlotId`    | `string` (uuid)  | yes      | Source `palette_paints.slot_id`; informational only.                       |
| `paintId`         | `string` (uuid)  | yes      | The slot's paint id — used during slot resolution.                         |
| `position`        | `int`            | yes      | Slot position within the source palette.                                   |

### `RecipeNoteExport`

| Field      | Type                | Required | Description                                                                       |
| ---------- | ------------------- | -------- | --------------------------------------------------------------------------------- |
| `position` | `int` (`>= 0`)      | yes      | Order within the parent (recipe or step).                                         |
| `body`     | `string` (1–5000)   | yes      | Markdown-allowed note text.                                                       |
| `createdAt`| `string` (ISO 8601) | yes      | Original creation timestamp — informational; new row uses `now()`.                |

### `RecipePhotoExport` (v1: Variant C — photos omitted)

**Locked in for v1: photos are not portable.** Every `photos` array in a v1 export is empty, `coverPhotoLocalId` is always `null`, and the importer never reads from or writes to the `recipe-photos` Storage bucket. The `RecipePhotoExport` type exists only as a reservation so future versions can extend it without a breaking schema bump.

```ts
// src/modules/recipes/types/recipe-export-photo.ts
/**
 * Reserved for future schema versions. Always empty in v1.
 *
 * v2 candidates (deferred — see "Future variants" below):
 *   - inline base64 self-contained export
 *   - storage-path-only with server-side object copy
 */
export type RecipePhotoExport = never;
```

The v1 importer **rejects** any document whose `photos` arrays are non-empty (or whose `coverPhotoLocalId` is non-null) with `"Photos are not supported in this export version. Re-export from a newer Grimify build."` — this protects against forward-incompatible payloads showing up.

#### Future variants (deferred)

If photo portability becomes a product requirement, two candidates remain on the table:

- **Variant A — inline base64** — self-contained, fattens the file (a 5-photo recipe ≈ 10–20 MB), no Storage round-trip on import.
- **Variant B — storage path + server copy** — small JSON, but needs Storage policy changes for cross-user copy (or an admin-only `SECURITY DEFINER` function).

Either would ship as `schemaVersion: "grimify.recipe.v2"` with a per-version parser path. v1 importers reading a v2 document fall through to "Unsupported version" cleanly.

## Sample payload

```json
{
  "schemaVersion": "grimify.recipe.v1",
  "kind": "recipe",
  "exportedAt": "2026-05-09T13:42:11.000Z",
  "source": {
    "app": "grimify",
    "appVersion": "1.45.0",
    "originRecipeId": "f1f5b4f0-1111-4aaa-bbbb-cccccccccccc",
    "originPaletteId": "c2e3a4b5-2222-4ddd-bbbb-eeeeeeeeeeee",
    "originUserId": "9d8e7f6a-3333-4eee-aaaa-ffffffffffff"
  },
  "recipe": {
    "title": "Blood Raven Veteran — Armour and Weapon",
    "summary": "Step-by-step recipe for the chapter colour scheme. Builds the armour from a Mephiston Red basecoat and finishes with edge highlights in Wild Rider Red.",
    "isPublic": true,
    "createdAt": "2026-04-12T09:30:00.000Z",
    "updatedAt": "2026-05-08T18:11:42.000Z",
    "paletteRef": {
      "originPaletteId": "c2e3a4b5-2222-4ddd-bbbb-eeeeeeeeeeee",
      "name": "Blood Raven Marines"
    },
    "coverPhotoLocalId": "photo-recipe-0",
    "sections": [
      {
        "localId": "section-0",
        "title": "Base coats",
        "position": 0,
        "steps": [
          {
            "localId": "section-0-step-0",
            "position": 0,
            "title": "Prime and base",
            "technique": "airbrush",
            "instructions": "Prime in **Chaos Black**, then base coat the armour with thinned Mephiston Red.",
            "paints": [
              {
                "position": 0,
                "paint": {
                  "id": "11111111-1111-4111-8111-111111111111",
                  "name": "Mephiston Red",
                  "hex": "#A02020",
                  "brandName": "Citadel",
                  "productLineName": "Base",
                  "paintType": "base",
                  "isMetallic": false
                },
                "paletteSlotRef": {
                  "originSlotId": "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
                  "paintId": "11111111-1111-4111-8111-111111111111",
                  "position": 0
                },
                "ratio": "thinned 1:1 with Lahmian Medium",
                "note": "Two thin coats."
              }
            ],
            "notes": [],
            "photos": []
          }
        ]
      }
    ],
    "notes": [
      {
        "position": 0,
        "body": "Cover photo taken under daylight LED at 5500K.",
        "createdAt": "2026-05-08T18:00:00.000Z"
      }
    ],
    "photos": []
  }
}
```

## Forward-compatibility strategy

- `schemaVersion` is a closed string literal (`"grimify.recipe.v1"`). Adding a field that is *non-breaking* (e.g., a new optional `recipe.tags` array) does **not** bump the version — the importer ignores unknown top-level fields with a warning.
- A *breaking* change (renaming a field, changing a type, removing a field, requiring a new field) bumps to `"grimify.recipe.v2"`. The importer recognizes both versions; v1 documents are upgraded in-memory before the resolver runs.
- Unknown `schemaVersion` → reject with `"Unsupported recipe export version: {value}. Update Grimify and try again."`
- Unknown `kind` → reject with `"This file does not look like a Grimify recipe export."`
- Unknown nested fields are dropped silently with a single aggregated warning (`"Ignored {n} unknown fields"`) so users on older Grimify versions importing newer exports get a useful experience.

## Validation rules

Document-level (run before any DB work):

| Rule                                                                                           | Error message                                            |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Document is valid JSON                                                                         | "File is not valid JSON."                                |
| `schemaVersion === "grimify.recipe.v1"`                                                        | "Unsupported recipe export version."                     |
| `kind === "recipe"`                                                                            | "This file is not a recipe export."                      |
| `recipe.title` length 1–120 after trim                                                         | "Title must be 1–120 characters."                        |
| `recipe.summary === null` or length ≤ 5000                                                     | "Summary must be 5000 characters or fewer."              |
| `recipe.sections` is an array (length 0 allowed)                                               | "Sections must be a list."                               |
| Every `section.title` 1–120                                                                    | "Section title must be 1–120 characters."                |
| Every `section.position` is a non-negative integer                                             | "Section position must be ≥ 0."                          |
| Every `step.position` is a non-negative integer                                                | "Step position must be ≥ 0."                             |
| Every `step.instructions === null` or length ≤ 5000                                            | "Step instructions must be 5000 characters or fewer."    |
| Every `stepPaint.position` is a non-negative integer                                           | "Step-paint position must be ≥ 0."                       |
| Every `stepPaint.note === null` or length ≤ 500                                                | "Paint note must be 500 characters or fewer."            |
| Every `note.body` 1–5000                                                                       | "Note body must be 1–5000 characters."                   |
| Every `localId` is unique within its scope                                                     | "Duplicate localId: {value}."                            |
| Every `photos` array is empty (recipe-level and step-level)                                    | "Photos are not supported in this export version."       |
| `coverPhotoLocalId === null`                                                                   | "Photos are not supported in this export version."       |

Validators live in `src/modules/recipes/validation.ts`, mirror the existing palette validators (return `string | null` per field, plus an aggregator returning `Record<string, string>`).

## Conflict and resolution table

| Situation                                                                  | Behavior                                                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Title collides with an existing recipe owned by the importing user         | Allowed — recipes have no unique-title constraint. Imported recipe keeps the title verbatim.                   |
| `originRecipeId` matches a recipe already owned by the importing user      | Default action is **Skip** with a "You already imported this recipe on {date}" message; user may override with "Import as a new copy". See "Idempotency" section. |
| Paint id resolves to an existing paint                                     | Use it; record as `matched`.                                                                                   |
| Paint id missing but `(brandName, productLineName, paintName)` triple matches exactly one paint | Use the match; record as `triple-fallback`.                                                                    |
| Paint id missing and triple matches multiple or none, but `(hex, brandName, paintName)` matches exactly one paint | Use the match; record as `hex-fallback`.                                                                       |
| Paint cannot be resolved by any policy                                     | The step paint row is **skipped** (the step is preserved, but that paint slot is dropped). Counted as `unresolved`. |
| `paletteRef` resolves to a palette the importing user owns                 | Set `recipe.palette_id` to that palette id.                                                                    |
| `paletteRef.originPaletteId` does not match, but `paletteRef.name` matches an importing-user palette exactly | Set `recipe.palette_id` to that palette id; record as `palette-name-fallback`.                                 |
| `paletteRef` cannot be resolved                                            | Set `recipe.palette_id` to `null`; surface a warning with the original palette name.                           |
| `paletteSlotRef.paintId` does not match any slot in the resolved palette   | Set `palette_slot_id` to `null` on the step paint row; the `paint_id` resolution still applies.                |
| Schema version unsupported                                                 | Reject the entire import; no rows created.                                                                     |
| `kind !== "recipe"`                                                        | Reject the entire import.                                                                                      |
| Validation error on any field                                              | Reject the entire import; surface aggregated errors keyed by field path.                                       |
| Document has non-empty `photos` arrays or non-null `coverPhotoLocalId`     | Reject the entire import — v1 does not support portable photos. Suggest re-exporting from a newer build.        |

The `unresolved` count is reported on success. If `unresolved === total step paints`, the user is asked to confirm before the import commits ("None of the paints in this recipe could be matched to the catalog. Continue anyway?").

## Cross-reference resolution policy

Same chain used by the palette importer:

1. **By id** — `paints.id = $id`. Cheapest and most reliable when both source and target run the same catalog seed.
2. **By triple** — `(brand_name, product_line_name, paint_name)` — survives paint-id regeneration in the source DB.
3. **By hex+name** — `(hex, brand_name, paint_name)` — survives a brand rename.
4. **Skip** — the importer **never** creates `paints`, `brands`, or `product_lines` rows. The catalog is curated and additions go through the admin "Add paint to catalog" flow.

Implementation note: the batch-resolution helper `resolvePaintReferences(client, refs)` lives at `src/modules/paints/utils/resolve-paint-references.ts` and is **shared** with the palette importer (introduced in `11-color-palettes/12-palette-import-export.md`). It takes the deduplicated list of `PaintReference` entries and returns `Map<refKey, ResolvedPaint | null>`. The action then walks the document and applies the map. This keeps the per-recipe resolution to two queries (id batch + triple batch) regardless of recipe size — and any improvement to the resolver (e.g., caching, telemetry) lands in one place for both importers.

Palette resolution: a recipe-specific helper `resolveRecipePaletteRef(client, userId, ref)` does the id-or-name lookup against the importing user's palettes and returns either a palette id or `null`. It lives in `src/modules/recipes/services/recipe-service.ts` because it is recipe-specific (palette-name fallback is only meaningful in the recipe-import flow).

## Idempotency

Recipes carry a new column `recipes.origin_recipe_id uuid` (nullable, no foreign key — the source row may not exist on this database). On import the importer:

1. Reads `source.originRecipeId` from the export document.
2. Queries `SELECT id, created_at FROM recipes WHERE user_id = $importingUserId AND origin_recipe_id = $originRecipeId LIMIT 1`.
3. If a row exists, the dialog defaults to **Skip** and shows: "You already imported this recipe on {createdAt}. Skip and keep the existing copy, or import as a new copy?" The user can override to "Import as a new copy" — that path proceeds with a new row whose `origin_recipe_id` is the same, so subsequent imports will again default to Skip and surface every prior import in the warning.
4. If no row exists, the import proceeds normally; on success, `recipes.origin_recipe_id` is set to `$originRecipeId`.

This applies to every import path — single, bulk, user, and admin. Bulk import respects the per-file decision: files that match an existing `origin_recipe_id` are skipped silently and reported in the per-file result table; the user can re-run the bulk import with an "Import skipped files as new copies" toggle if they need to.

Why a new column rather than a hash of (title + sections + …): the title and structure are mutable on either side; only the source id is a stable identity. The column is a soft signal — there is **no** unique constraint, because re-importing as a new copy is a supported flow.

### Migration

```sql
-- supabase/migrations/{ts}_recipe_origin_id.sql
ALTER TABLE public.recipes
  ADD COLUMN origin_recipe_id uuid NULL;

CREATE INDEX recipes_origin_recipe_id_idx
  ON public.recipes (user_id, origin_recipe_id)
  WHERE origin_recipe_id IS NOT NULL;
```

The partial index keeps the lookup cheap without bloating the index for the common case (recipes created from scratch, where `origin_recipe_id` stays `NULL`).

## Authorization

| Action                              | Caller                | Allowed?                                                              |
| ----------------------------------- | --------------------- | --------------------------------------------------------------------- |
| Export own recipe                   | recipe owner          | yes — read goes through the existing service layer                    |
| Export public recipe                | any signed-in user    | yes — `is_public = true` recipes are readable                         |
| Export private recipe                | non-owner             | no — service returns 404                                              |
| Import recipe (self)                | signed-in user        | yes                                                                   |
| Admin export (any user's recipe)    | admin                 | yes — gated by `'admin' = ANY(get_user_roles(auth.uid()))`            |
| Admin import (on behalf of user)    | admin, target user ≠ self | yes — gated by admin check; rejects when `userId === auth.uid()`      |
| Admin import (on self)              | admin acting on self  | rejected with `"Use the user-facing import flow on your own account."` |

The user-facing actions live in `src/modules/recipes/actions/`. The admin variants live in `src/modules/admin/actions/` and call into the same shared service helpers, but enforce the admin check + self-protection inline (matches `add-paint-to-collection.ts`).

## Admin audit log

Recipe admin actions write to the `admin_audit_log` table introduced by the sibling palette feature (`11-color-palettes/12-palette-import-export.md` — see its "Admin audit log" section for the full table schema, why a free-text reason is required, and the forward path with Epic 8). This feature does **not** ship the migration; it is a hard prerequisite that the palette feature lands first (or, if both ship in the same release, the migration is consolidated into a single PR).

### Recipe-specific `action_kind` values

| Value                  | Written by                                         | Granularity                                                                              |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `recipe.export`        | `adminExportRecipe` server action                  | One row per call. `resource_id` = source recipe id. `payload_size_bytes` = JSON size.    |
| `recipe.bulk-export`   | `adminExportRecipesBulk` server action             | **One row per recipe** in the bulk run. `resource_id` = each recipe's id.                |
| `recipe.import`        | `adminImportRecipe` server action                  | One row per call. `resource_id` = the newly-created recipe id.                           |
| `recipe.bulk-import`   | `adminImportRecipesBulk` server action             | **One row per file** in the bulk run. `resource_id` = the new recipe id (or `NULL` on import failure, with the failure reason in `reason` after a `" — failed: "` separator). |

### Reason capture

Every admin recipe dialog (single export, bulk export, single import, bulk import) requires a free-text reason of ≥ 8 non-whitespace characters. The server action re-validates and rejects empty/whitespace reasons. For bulk operations, the reason is captured **once** at the dialog level and copied onto every audit row written by that bulk run, so a single export of 30 recipes produces 30 audit rows with the same reason text and the same `created_at` window — making bulk runs easy to correlate.

Audit insert failures cause the admin action to return an error; admin actions never silently skip the audit row.

## Routes

| Route                                  | Description                                                                                | Auth                |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| `/recipes/[id]`                        | (modify) — adds Export button (with Copy-JSON secondary) visible to owner                  | conditional         |
| `/user/recipes`                        | (modify) — adds "Import recipe" (file/paste), "Export all" (ZIP), "Import recipes" (ZIP)   | signed-in           |
| `/admin/users/[id]/recipes`            | (modify) — adds Export per row, "Export all", "Import on behalf of", and bulk-import (ZIP) | admin only          |

No new public route surfaces are introduced — every action is a server action invoked from a client component. Single-recipe download returns a JSON string; bulk download returns a `Uint8Array` (ZIP) that the client wraps as a `Blob`. Variant C (no photo portability in v1) means there is no Storage round-trip on either side.

## Bulk operations

### Bulk export

`exportAllRecipes()` (and admin's `adminExportRecipesBulk(targetUserId, { reason })`) build one `RecipeExport` per owned recipe and pack them into a ZIP using the pure helper `pack-recipe-zip.ts` (built on a small ZIP encoder — no streaming required at v1 sizes). The ZIP contains:

```
recipe-{slugified-title}-{shortId}.grimify-recipe.json   (one per recipe)
manifest.json
```

`manifest.json` shape:

```json
{
  "schemaVersion": "grimify.recipe-bundle.v1",
  "kind": "recipe-bundle",
  "exportedAt": "2026-05-09T18:00:00.000Z",
  "source": { "app": "grimify", "appVersion": "1.45.0", "originUserId": "..." },
  "recipes": [
    { "file": "recipe-blood-raven-armour-9c2f0c54.grimify-recipe.json", "originRecipeId": "9c2f0c54-...", "title": "Blood Raven Armour" }
  ]
}
```

`shortId` is the first 8 chars of `originRecipeId` and disambiguates files when two recipes share a slug. The manifest is informational — bulk import does **not** require it; if it is absent, the importer treats every `*.grimify-recipe.json` entry as a recipe document and resolves them one by one.

### Bulk import

`importRecipesBulk(zipBytes, { onConflict: 'skip' | 'import-as-new' })` (and `adminImportRecipesBulk(targetUserId, zipBytes, { reason, onConflict })`) unzip the input, filter to `*.grimify-recipe.json` entries, and run the single-import flow per file inside a loop. The result shape:

```ts
type RecipeBulkImportResult = {
  perFile: Array<{
    fileName: string;
    result: RecipeImportResult;       // the single-file discriminated result
  }>;
  summary: {
    total: number;
    imported: number;                 // kind === 'success' or 'partial'
    skipped: number;                  // pre-existing originRecipeId match
    failed: number;                   // kind === 'error'
  };
};
```

Per-file failures do **not** abort the bulk run — failed files are reported in `perFile` and the loop continues. Each successful import (single, full, or partial) is independently committed; a crash midway through leaves an in-progress bulk run with however-many recipes already created. The bulk-import dialog surfaces this clearly: "Imported 17, skipped 3, failed 2" with a per-file expandable detail.

### Size limits

- ZIP payload: capped at **25 MB** at the action boundary (rejects with `code: 'payload_too_large'`). This is comfortable headroom for hundreds of recipes at v1 (no photos, JSON-only).
- Per-file payload: capped at **2 MB** (single recipes are kilobytes today; this is a generous ceiling against malicious zips).
- File count: capped at **500** entries per ZIP. Higher counts are valid product use cases (a power user with a deep library) but should be paginated through repeated bulk runs in v1.

These caps live as constants in `src/modules/recipes/validation.ts` and are surfaced in the dialogs as static help text.

## Module additions

```
src/modules/recipes/
├── actions/
│   ├── export-recipe.ts                    NEW — single-recipe export; returns JSON document for download
│   ├── export-all-recipes.ts               NEW — bulk: returns Uint8Array (ZIP) of every owned recipe
│   ├── import-recipe.ts                    NEW — single-recipe import; validates + resolves + transactionally creates
│   └── import-recipes-bulk.ts              NEW — bulk: unzip + per-file single-import loop
├── components/
│   ├── recipe-export-button.tsx            NEW — owner-only button on /recipes/[id]; download + Copy JSON
│   ├── recipe-export-all-button.tsx        NEW — bulk-export trigger on /user/recipes
│   ├── recipe-import-dialog.tsx            NEW — File / Paste tabs + preview + commit
│   ├── recipe-import-bulk-dialog.tsx       NEW — ZIP upload + per-file resolution preview
│   ├── recipe-import-result.tsx            NEW — single-import post-commit summary
│   └── recipe-import-bulk-result.tsx       NEW — bulk: per-file results table + aggregate summary
├── services/
│   └── (modify) recipe-service.ts          add: buildRecipeExport, importRecipeFromPayload,
│                                                resolveRecipePaletteRef, listRecipesForUser,
│                                                lookupRecipeByOriginId
├── types/
│   ├── recipe-export.ts                    NEW — RecipeExport, RecipeSourceMetadata, top-level doc type
│   ├── recipe-export-section.ts            NEW — SectionExport
│   ├── recipe-export-step.ts               NEW — StepExport, StepPaintExport
│   ├── recipe-export-note.ts               NEW — RecipeNoteExport
│   ├── recipe-export-photo.ts              NEW — RecipePhotoExport (Variant C: type alias = never)
│   ├── recipe-export-palette-ref.ts        NEW — PaletteReference, PaletteSlotReference
│   ├── recipe-bundle-manifest.ts           NEW — RecipeBundleManifest (the bulk ZIP's manifest.json shape)
│   ├── recipe-import-result.ts             NEW — single-import discriminated result
│   └── recipe-bulk-import-result.ts        NEW — bulk: { perFile, summary }
├── utils/
│   ├── build-recipe-export.ts              NEW — pure: hydrated Recipe → RecipeExport
│   ├── parse-recipe-export.ts              NEW — pure: unknown → RecipeExport | { errors[] }
│   ├── pack-recipe-zip.ts                  NEW — pure: RecipeExport[] → Uint8Array (ZIP)
│   ├── unpack-recipe-zip.ts                NEW — pure: Uint8Array → { perFile: { name, content }[] }
│   └── slugify-recipe-title.ts             NEW — for download filenames
└── (modify) validation.ts                  add validators for export fields + size-limit constants
```

The cross-reference resolver is **not** in this module — it lives in `src/modules/paints/` and is shared with the palette importer:

```
src/modules/paints/
└── utils/
    └── resolve-paint-references.ts          (introduced by the palette feature; consumed here unchanged)
```

If the palette feature has not landed yet, this feature ships the file under `src/modules/paints/utils/` so the location is identical regardless of merge order.

```
src/modules/admin/
├── actions/
│   ├── admin-export-recipe.ts              NEW — admin-gated single-recipe export
│   ├── admin-export-recipes-bulk.ts        NEW — admin-gated bulk export of a user's recipes
│   ├── admin-import-recipe.ts              NEW — admin-gated single import; rejects self-modification
│   └── admin-import-recipes-bulk.ts        NEW — admin-gated bulk import; rejects self-modification
├── components/
│   ├── admin-recipe-list-table.tsx         (modify or NEW) — adds Export per row + bulk controls
│   ├── admin-recipe-export-button.tsx      NEW — single-recipe admin export with required Reason
│   ├── admin-recipe-export-all-button.tsx  NEW — bulk admin export with required Reason
│   ├── admin-recipe-import-dialog.tsx      NEW — single-recipe admin import with required Reason
│   └── admin-recipe-import-bulk-dialog.tsx NEW — bulk admin import with required Reason
└── services/
    ├── (modify) admin-recipe-service.ts    admin-scoped reads/writes; create if no service exists yet
    └── admin-audit-service.ts              (introduced by the palette feature) — used unchanged here
```

DB migrations introduced by this feature:

- `supabase/migrations/{ts}_recipe_origin_id.sql` — adds `recipes.origin_recipe_id` plus the partial index (see "Idempotency" → Migration).
- `supabase/migrations/{ts}_admin_recipe_policies.sql` — admin RLS policies on `recipes`, `recipe_sections`, `recipe_steps`, `recipe_step_paints`, `recipe_notes`, `recipe_photos` (mirror the palette-side admin policies). The audit-log table itself is **not** introduced here — that ships with the palette feature; this feature is a hard consumer of it.

## Implementation Plan

### Overview

This feature ships in two layers — first the user surface (single + bulk export, single + bulk import, idempotency), then the admin surface that wraps the same service helpers behind admin-only actions and writes audit rows. The implementation is intentionally narrow at the schema level: a single column-add migration (`recipes.origin_recipe_id`) plus admin-only RLS policies on the existing recipe tables. The cross-reference resolver lives in `src/modules/paints/utils/` and is **shared** with the palette importer (introduced by `11-color-palettes/12-palette-import-export.md`); if that feature has not landed yet, the file ships from this PR at the same path. Photo portability is **deferred** — Variant C means the v1 importer never touches Storage, so there is no Storage migration, no `service_role` lift, and no per-photo failure mode.

The admin audit log table itself is **not** introduced here — it is a hard prerequisite from the palette feature. If both features ship in the same release, consolidate the audit-log migration into one PR.

### Step-by-step ordering

1. **Types** — Add the export type files under `src/modules/recipes/types/` (`recipe-export.ts`, `recipe-export-section.ts`, `recipe-export-step.ts`, `recipe-export-note.ts`, `recipe-export-photo.ts`, `recipe-export-palette-ref.ts`, `recipe-bundle-manifest.ts`, `recipe-import-result.ts`, `recipe-bulk-import-result.ts`). `RecipePhotoExport` is `type RecipePhotoExport = never` for v1 (Variant C). Mirror the palette importer's `PaintReference` shape so the shared resolver consumes both without per-caller adapter code.
2. **Migration — `origin_recipe_id`** — Ship `supabase/migrations/{ts}_recipe_origin_id.sql` adding the nullable column + partial index (no unique constraint; re-importing as a new copy is a supported flow). Regenerate Supabase types.
3. **Migration — admin recipe policies** — Ship `supabase/migrations/{ts}_admin_recipe_policies.sql` mirroring the palette-side admin RLS policies across `recipes`, `recipe_sections`, `recipe_steps`, `recipe_step_paints`, `recipe_notes`, `recipe_photos`. Confirms admin can read every owner's recipe and insert child rows on behalf of any user.
4. **Pure utilities** — Implement `build-recipe-export.ts` (hydrated `Recipe` → `RecipeExport`; always writes `photos: []` and `coverPhotoLocalId: null`), `parse-recipe-export.ts` (unknown → `RecipeExport | { errors[] }`; rejects non-empty `photos` and non-null `coverPhotoLocalId`), `pack-recipe-zip.ts` (`RecipeExport[]` + `manifest.json` → `Uint8Array`), `unpack-recipe-zip.ts` (`Uint8Array` → `{ name, content }[]`), and `slugify-recipe-title.ts`. All four ZIP-adjacent helpers are pure and unit-testable without a Supabase client.
5. **Resolver consumption** — The shared `resolvePaintReferences` lives at `src/modules/paints/utils/resolve-paint-references.ts`. If the palette feature has not yet landed, ship the file from this PR (its API is fully specified in `11-color-palettes/12-palette-import-export.md`); otherwise import it unchanged. **Do not duplicate the resolver inside the recipes module.**
6. **Service helpers** — Modify `recipe-service.ts` to add `buildRecipeExport(client, recipeId)`, `listRecipesForUser(client, userId)` (used by bulk export), `lookupRecipeByOriginId(client, userId, originRecipeId)` (used by idempotency check), `importRecipeFromPayload(client, userId, payload, opts)` (the transactional importer; opens a single SQL function or wraps a sequence with compensating delete — see step 8), and `resolveRecipePaletteRef(client, userId, ref)`.
7. **User export actions** — `src/modules/recipes/actions/export-recipe.ts` (`'use server'`; auth check; calls `buildRecipeExport`; returns the JSON document as a `string`) and `export-all-recipes.ts` (`'use server'`; auth check; iterates `listRecipesForUser`; calls `pack-recipe-zip`; returns `Uint8Array`). Client components trigger the download via `Blob` + `<a download>` for both.
8. **User import actions** — `import-recipe.ts` parses + validates; runs the idempotency check via `lookupRecipeByOriginId`; if a match exists and `onConflict !== 'import-as-new'`, returns `kind: 'skipped'` without writing. Otherwise resolves paint references via the shared resolver, resolves palette ref, then opens a Supabase transaction (preferred) — or runs an `insertRecipeAndChildren` SQL function — to write the recipe + sections + steps + step_paints + notes + `origin_recipe_id` in one commit. `import-recipes-bulk.ts` calls `unpack-recipe-zip`, filters to `*.grimify-recipe.json`, runs the single-import flow per file in a loop, and returns `RecipeBulkImportResult` (per-file results + aggregate summary). Per-file failures do not abort the bulk run.
9. **User UI** — Build `<RecipeExportButton>` (owner-only on `/recipes/[id]`; download + Copy-JSON secondary), `<RecipeExportAllButton>` (on `/user/recipes`), `<RecipeImportDialog>` (File / Paste tabs + resolution preview + commit), `<RecipeImportBulkDialog>` (ZIP upload + per-file resolution preview + bulk commit), `<RecipeImportResult>`, and `<RecipeImportBulkResult>` (per-file table + aggregate summary). Single imports complete with `router.push('/recipes/${result.recipeId}')` + toast; bulk imports stay on `/user/recipes` and render the result panel inline.
10. **Admin actions** — `admin-export-recipe.ts`, `admin-export-recipes-bulk.ts`, `admin-import-recipe.ts`, `admin-import-recipes-bulk.ts`. Each mirrors its user-side counterpart and adds: (a) admin role check via `'admin' = ANY(get_user_roles(auth.uid()))`; (b) self-protection (`userId !== auth.uid()` for import paths; reject with `"Use the user-facing import flow on your own account."`); (c) required `reason` argument validated to `≥ 8` non-whitespace characters; (d) one or more `admin_audit_log` rows written with the appropriate `action_kind` (`recipe.export`, `recipe.bulk-export`, `recipe.import`, `recipe.bulk-import`) — bulk export writes one row **per recipe**, bulk import writes one row **per file** (with `resource_id = NULL` and `reason` suffix `" — failed: <detail>"` on per-file failure). Audit insert failures fail the action; never silently swallowed. Use `revalidatePath('/admin/users/${userId}/recipes')` (and on single-import success, `'/admin/users/${userId}/recipes/${recipeId}'`).
11. **Admin UI** — Add or modify `admin-recipe-list-table.tsx`, the per-row export button (`<AdminRecipeExportButton>`), the bulk-export button (`<AdminRecipeExportAllButton>`), the single-import dialog (`<AdminRecipeImportDialog>`), and the bulk-import dialog (`<AdminRecipeImportBulkDialog>`). Each admin dialog includes a required Reason `<textarea>` (with `≥ 8` non-whitespace char client-side validation that mirrors the server check) and surfaces the matching error from the server when validation fails server-side. Reuse `<RecipeImportResult>` and `<RecipeImportBulkResult>` for the post-commit summaries — those have no admin-specific branches.
12. **Manual QA + perf check** — Run the QA checklist below. Verify a 200-recipe bulk export completes inside the action timeout and produces a ZIP under 25 MB; verify a 200-file bulk import surfaces sensible per-file results.

### Manual QA checklist

**Single export / import**

- Export an owned recipe from `/recipes/[id]`; download succeeds; file is valid JSON; opens cleanly in a JSON viewer
- Use the "Copy JSON" secondary action; clipboard contains the same JSON document
- Verify export `recipe.photos === []` and `recipe.coverPhotoLocalId === null` for a recipe that has photos in the DB; verify Storage is never called during export
- Import the file via **File** picker → `/user/recipes`; recipe created under current user with `is_public = false`; redirect to `/recipes/[newId]`; toast surfaces matched/fallback/unresolved counts
- Import the same JSON via **Paste** textarea; same outcome
- Re-import the same file: dialog defaults to **Skip** with "You already imported this recipe on {date}"; clicking Skip does not write; the existing copy remains untouched
- Re-import again with "Import as a new copy" override; a second row is created with the same `origin_recipe_id`; subsequent imports surface the warning again

**Resolver behaviour**

- Re-import after the source recipe is deleted; resolver still works (paints still resolve by id)
- Edit the JSON to invalidate one paint id; resolver falls back to triple match; counts reflect the fallback
- Edit the JSON to invalidate id + line for one paint; resolver falls back to hex+name; counts reflect the fallback
- Edit the JSON so one paint cannot be resolved by any policy; that step paint row is dropped; the recipe still imports; `unresolved` count = 1
- Import a recipe where every paint is unresolvable; the dialog asks for confirmation before commit
- Import a recipe whose palette doesn't exist on the importing user; `palette_id` is null; warning surfaced
- Import a recipe whose `paletteRef.name` matches a different palette than `originPaletteId`; resolver picks the name match and records the fallback

**Schema rejection**

- Import an export with `schemaVersion: "grimify.recipe.v9"`; rejected with "Unsupported version"
- Import a palette JSON file (wrong `kind`); rejected with "This file is not a recipe export"
- Import malformed JSON; rejected with "File is not valid JSON."
- Hand-craft a v1 document with non-empty `photos`; rejected with "Photos are not supported in this export version. Re-export from a newer Grimify build."
- Hand-craft a v1 document with `coverPhotoLocalId` set to a string; rejected with the same message

**Bulk export / import**

- "Export all" on `/user/recipes` with 0 recipes downloads an empty ZIP that still contains a `manifest.json` with `recipes: []`
- "Export all" with a deep library produces a ZIP whose `manifest.json` lists every recipe; opening any `*.grimify-recipe.json` entry round-trips through single-import
- Bulk import the just-exported ZIP; result table shows every file as **Skipped** (origin matches); aggregate summary `{ total, imported: 0, skipped: total, failed: 0 }`
- Bulk import the same ZIP with the "Import skipped files as new copies" toggle; every file imports as a new copy; aggregate summary reflects all imports
- Bulk import a ZIP that contains one malformed JSON; result table marks that file `failed`; the rest still import
- Bulk import a ZIP > 25 MB; rejected at the action boundary with `code: 'payload_too_large'`
- Bulk import a ZIP with > 500 entries; rejected with the entry-count cap message
- Bulk import a ZIP that contains a > 2 MB JSON entry; that file is `failed`; others continue

**Admin flows**

- As admin, export another user's recipe from `/admin/users/[id]/recipes`; download succeeds; an `admin_audit_log` row exists with `action_kind = 'recipe.export'`, the supplied `reason`, and `payload_size_bytes` set
- As admin, attempt single export with a 7-character reason; rejected with the validation message; no audit row written
- As admin, "Export all" with 30 recipes; ZIP downloads; **30** `admin_audit_log` rows exist with `action_kind = 'recipe.bulk-export'`, all sharing the same `reason` text and a tight `created_at` window
- As admin, import on behalf of another user; recipe appears under that user's account, not yours; an `admin_audit_log` row exists with `action_kind = 'recipe.import'`, `target_user_id` set to the target, `resource_id` set to the new recipe id
- As admin, bulk-import a 5-file ZIP with 1 malformed entry; **5** audit rows exist with `action_kind = 'recipe.bulk-import'`; the failed file's row has `resource_id = NULL` and `reason` ending with `" — failed: <detail>"`
- As admin, attempt to import "on behalf of" yourself; rejected with the "use the user surface" error; no audit row written
- As a regular user, call the admin import action via curl with a forged session; rejected by the role check; no audit row written
- Force `admin_audit_log` insert to fail (e.g., temporarily disable the table); the admin action returns an error and the recipe row(s) are rolled back

**General**

- `npm run build` + `npm run lint`

## Risks & Considerations

- **Photo portability is deferred (Variant C)**: v1 omits photos entirely — `photos: []` and `coverPhotoLocalId: null` on every export, and the importer rejects any document that contains photo data. This avoids the Storage round-trip and `service_role` lift that Variants A and B would require. The cost is a known v1 limitation: an imported recipe loses its photos. Users who care will re-photograph; product will revisit if portable photos becomes a concrete ask. The `RecipePhotoExport` type is reserved (`type RecipePhotoExport = never`) so a v2 schema can extend it without renaming.
- **Transactional integrity**: Recipes write to up to five tables (`recipes`, `recipe_sections`, `recipe_steps`, `recipe_step_paints`, `recipe_notes`). A naive sequence of `insert` calls leaves orphans on partial failure. Two options: (a) a single SQL function `import_recipe(jsonb)` that runs the whole insert in one transaction (recommended; same pattern as `replace_palette_paints`); (b) a sequence of inserts wrapped in `try`/`catch` with a compensating delete keyed by the new recipe id. Bulk import does **not** wrap multiple files in a single transaction — each file commits independently so a midway crash leaves the imports that succeeded intact and reports the rest as failed on the next run.
- **Idempotency design**: `recipes.origin_recipe_id` is a soft signal with no unique constraint, because re-importing as a new copy is a supported flow (the user expectation is "make me another starting point"). The dialog defaults to **Skip** so the most common reflex (importing the same file twice by accident) doesn't silently double rows. The "Import as a new copy" override is explicit and surfaces existing copies in its warning. A unique constraint here would block the override path; a hash-based duplicate check would mis-fire on legitimate edit-and-reimport workflows.
- **`palette_paints.slot_id` opacity**: `palette_slot_id` references a slot in the original palette. The export carries the slot's `paintId` so the importer can re-find an equivalent slot in the resolved palette by `(palette_id, paint_id)`. If the user's palette has multiple slots for the same paint, the importer picks the lowest-position match and records a soft warning.
- **Catalog drift on `paintType`**: `paint_type` is informational in the export; the importer ignores it during resolution. If the catalog changes a paint's type later, that's fine — the import doesn't depend on it.
- **Markdown content**: `summary`, `instructions`, and `notes.body` may contain markdown. Preserve verbatim — don't sanitize or re-format on export. The renderer handles sanitization at view time.
- **Schema version drift**: When a v2 ships (likely the photo-portability bump), document the v1→v2 upgrade path in this doc or a sibling `06.1-recipe-export-v2.md`. v1 importers reading v2 fall through to "Unsupported version" cleanly. The closed string-literal discriminator makes this safe.
- **Bulk performance ceiling**: Bulk export with hundreds of recipes is bound by per-recipe `getRecipeById` round-trips. At v1 sizes the action timeout is comfortable; if it ever isn't, the next move is a batched `listRecipesForUserHydrated(userIds)` service helper, not streaming. Bulk import is bound by the per-file resolver pass, which already uses the shared two-query batch — there is no faster path until the catalog is local-cache-resident.
- **Tampering is allowed by design**: Exports are not signed or checksummed. Users can edit the JSON freely (this is an explicit product call, not an oversight) — the importer treats every input as untrusted and validates against the schema. The catalog is curated, so a user cannot smuggle in arbitrary paints by editing the file. If integrity ever becomes a regulatory concern, add an HMAC signature scoped to the exporting user's id rather than retrofitting an opaque hash.
- **Audit-log dependency**: This feature is a hard consumer of `admin_audit_log` (introduced by the palette feature). If the palette feature has not landed, this feature must ship the table migration — but in that case we're shipping the palette feature too, and consolidation is the right call.
- **Bulk audit volume**: A single bulk export of 200 recipes writes 200 audit rows. The `(actor_user_id, created_at desc)` index keeps the admin's recent activity view fast; querying *all* audit rows for a `target_user_id` does a different access pattern (`(target_user_id, created_at desc)`). Both indexes ship with the audit-log table. Audit retention/rotation is out of scope for v1.
- **ZIP encoder choice**: `pack-recipe-zip.ts` uses a small, dependency-light pure-JS ZIP encoder (no streaming) suitable for v1 sizes. If we ever raise the 25 MB cap meaningfully, swap in a streaming encoder behind the same `pack` interface — the action surface and result shape don't need to change.

## Resolved Decisions

1. **Download mechanism** — Server action returns the document body (JSON `string` for single export, `Uint8Array` for bulk ZIP) and the client component triggers `Blob` + `<a download>`. Rationale: keeps the auth check inside the server action, avoids a new public route surface, and stays parity with the palette importer.
2. **Import source** — Both **File picker** *and* **Paste textarea** are available, exposed as a tab toggle inside the import dialog. Both paths submit through the same `import-recipe` server action. Bulk import accepts a `.zip` only (paste isn't a useful surface for a binary archive).
3. **Photo handling** — **Variant C — photos omitted in v1.** Every export carries `photos: []` and `coverPhotoLocalId: null`; the importer rejects non-empty photo data. This drops the dependency on `03-recipe-photos.md` and avoids the `service_role` / Storage policy work Variants A and B would require. Variants A (inline base64) and B (storage-path + server copy) remain on the table for a future `grimify.recipe.v2` schema.
4. **Signing / checksumming** — **No.** Users are explicitly allowed to edit the JSON outside the app — that is a feature, not a hazard. The importer treats every payload as untrusted and validates against the schema; the curated catalog prevents arbitrary paint injection regardless. Revisit only if integrity becomes a regulatory concern.
5. **Admin audit reason** — **Required, free-text, ≥ 8 non-whitespace chars.** Captured once per dialog and copied onto every audit row written by that operation. Bulk export writes one audit row per recipe (forensic granularity); bulk import writes one audit row per file (with `resource_id = NULL` and a `" — failed: <detail>"` reason suffix when a per-file import fails). Audit insert failures fail the admin action — never silently swallowed. The full `admin_audit_log` schema and RLS policies are owned by the sibling palette feature; this feature consumes them unchanged.
6. **Cross-import with the palette importer** — **Shared.** `resolvePaintReferences` and the `PaintReference` shape live at `src/modules/paints/utils/resolve-paint-references.ts` and are consumed by both the palette and recipe importers. If the palette feature has not landed yet, this feature ships the file at the same path so merge order doesn't matter. No follow-up refactor is required.
7. **Recipe-id idempotency** — **Soft idempotency on `recipes.origin_recipe_id`.** Nullable column with a partial index, no unique constraint. The dialog defaults to **Skip** when an existing copy is found and offers an explicit "Import as a new copy" override. This applies to single, bulk, user, and admin paths. Migration ships in this PR.
8. **Bulk import / export** — **In scope for v1.** "Export all" produces a ZIP (`recipe-{slug}-{shortId}.grimify-recipe.json` per recipe + `manifest.json`); "Import recipes" accepts a ZIP and runs the single-import flow per file, reporting per-file results. Caps: 25 MB ZIP, 2 MB per file, 500 entries per ZIP. Per-file failures do not abort the run.

## Notes

- Follows the same pattern as `11-color-palettes/12-palette-import-export.md`. Shared utilities (the cross-reference resolver and the `admin_audit_log` table) are pre-extracted by that feature; this feature consumes them unchanged. If the two ship in the same release, consolidate the resolver and audit-log migration into one PR.
- DB-side changes in this PR: `recipes.origin_recipe_id` column + partial index, and admin RLS policies on the existing recipe tables. Optionally, a transactional `import_recipe(jsonb)` SQL function (step 8 of the implementation plan) — preferred over a TS-side compensating-delete pattern.
- Public-recipe export is allowed for any signed-in user (read access already exists). The import action always writes under the importing user's id; admin import writes under the admin-selected target user.
- Variant C (no photo portability) means this feature has no Storage dependency and no `service_role` lift in v1. A future `grimify.recipe.v2` that adopts Variant A or B will introduce both.
