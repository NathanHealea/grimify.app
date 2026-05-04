# Palette Schema and Module Scaffolding

**Epic:** Color Palettes
**Type:** Feature
**Status:** Done
**Branch:** `feature/palette-schema`
**Merge into:** `v1/main`

## Summary

Lay the data foundation for the Color Palettes epic: create the `palettes` and `palette_paints` tables with row-level security, and scaffold the `src/modules/palettes/` domain module so subsequent palette features can plug in without re-litigating schema or module shape.

A palette is a user-owned, ordered list of paints (owned or not) with an optional name and description. Database paints are referenced by `paint_id` on join rows; later features can add custom hex slots without re-writing the core schema.

## Acceptance Criteria

- [x] `palettes` table exists with `id`, `user_id`, `name`, `description`, `is_public`, `created_at`, `updated_at`
- [x] `palette_paints` table exists keyed on `(palette_id, position)` with `paint_id` and an optional `note`
- [x] RLS allows owners full access to their palettes, public read access to `is_public = true` palettes
- [x] `palette_paints` policies derive ownership through the parent `palettes` row
- [x] `updated_at` is maintained by a trigger that fires on `UPDATE`
- [x] `src/modules/palettes/` is scaffolded with `actions/`, `components/`, `services/`, `types/`, `utils/`, `validation.ts`
- [x] Service layer exposes `getPaletteById`, `listPalettesForUser`, `listPublicPalettes`, `createPalette`, `updatePalette`, `deletePalette`, `setPalettePaints`
- [x] Generated Supabase TypeScript types include the new tables
- [x] `npm run build` and `npm run lint` pass with no errors

## Database

### `palettes` Table

| Column        | Type          | Constraints                                                       |
| ------------- | ------------- | ----------------------------------------------------------------- |
| `id`          | `uuid`        | Primary key, default `gen_random_uuid()`                          |
| `user_id`     | `uuid`        | FK to `profiles.id` on delete cascade, not null                   |
| `name`        | `text`        | Not null, length 1–80                                             |
| `description` | `text`        | Nullable, max length 1000                                         |
| `is_public`   | `boolean`     | Not null, default `false`                                         |
| `created_at`  | `timestamptz` | Not null, default `now()`                                         |
| `updated_at`  | `timestamptz` | Not null, default `now()`, maintained by `set_updated_at` trigger |

### `palette_paints` Table

| Column       | Type          | Constraints                                                  |
| ------------ | ------------- | ------------------------------------------------------------ |
| `palette_id` | `uuid`        | FK to `palettes.id` on delete cascade, part of composite PK  |
| `position`   | `int`         | Not null, part of composite PK, `>= 0`                       |
| `paint_id`   | `uuid`        | FK to `paints.id` on delete cascade, not null                |
| `note`       | `text`        | Nullable, max length 500 (per-slot painter notes)            |
| `added_at`   | `timestamptz` | Not null, default `now()`                                    |

Composite primary key on `(palette_id, position)`. A single paint is allowed to appear more than once in a palette at different positions (a recipe might use the same shade at two layering steps).

### Indexes

- `idx_palettes_user_id` on `(user_id)` — scopes "my palettes" queries
- `idx_palettes_public` on `(is_public)` where `is_public = true` — scopes the public browse list
- `idx_palette_paints_paint_id` on `(paint_id)` — reverse lookup for "palettes that use this paint"

### Row Level Security

`palettes`:

- **SELECT**: Owners can read their own palettes; anyone (including anon) can read palettes where `is_public = true`
- **INSERT**: Authenticated users can create palettes for themselves (`auth.uid() = user_id`)
- **UPDATE / DELETE**: Owners only (`auth.uid() = user_id`)

`palette_paints`:

- **SELECT**: Visible if the parent palette is visible (owner or public)
- **INSERT / UPDATE / DELETE**: Allowed only when the caller owns the parent palette

Use `EXISTS (SELECT 1 FROM palettes p WHERE p.id = palette_paints.palette_id AND ...)` for derived ownership checks.

## Domain Module

Per `CLAUDE.md`'s Domain Module rule, scaffold `src/modules/palettes/` as the home for everything palette-related. Subsequent features in this epic add to it without restructuring.

```
src/modules/palettes/
├── actions/
│   ├── create-palette.ts
│   ├── update-palette.ts
│   └── delete-palette.ts
├── components/                   (filled in by 01-palette-management)
├── services/
│   ├── palette-service.ts        (shared shape — no Supabase client directly)
│   ├── palette-service.server.ts (uses createServerClient)
│   └── palette-service.client.ts (uses createBrowserClient)
├── types/
│   ├── palette.ts                (Palette: id, userId, name, description, isPublic, paints[])
│   ├── palette-paint.ts          (PalettePaint: position, paintId, note, paint?)
│   ├── palette-summary.ts        (lightweight list-row shape)
│   └── palette-form-state.ts     (validation/error shape for actions)
├── utils/
│   └── normalize-palette-positions.ts (re-numbers positions to 0..N-1 after edits)
└── validation.ts                 (palette-name and -description validators)
```

The service layer mirrors `collection-service` (`.client.ts` / `.server.ts` / `.ts`) so server actions and route loaders can both call it.

## Key Files

| Action | File                                                              | Description                                                            |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Create | `supabase/migrations/{ts}_create_palettes_tables.sql`             | Tables, indexes, RLS, `set_updated_at` trigger reuse                   |
| Create | `src/modules/palettes/types/palette.ts`                           | Hydrated palette shape including `PalettePaint[]`                      |
| Create | `src/modules/palettes/types/palette-paint.ts`                     | Join-row shape; `paint?` is the embedded `ColorWheelPaint` when loaded |
| Create | `src/modules/palettes/types/palette-summary.ts`                   | Slim shape for browse/list views (id, name, paint count, swatches)     |
| Create | `src/modules/palettes/types/palette-form-state.ts`                | `useActionState` return shape                                          |
| Create | `src/modules/palettes/validation.ts`                              | `validatePaletteName`, `validatePaletteDescription`                    |
| Create | `src/modules/palettes/services/palette-service.ts`                | Shared query helpers; pulls embedded paints in one round-trip          |
| Create | `src/modules/palettes/services/palette-service.server.ts`         | Server entry — used by route loaders + actions                         |
| Create | `src/modules/palettes/services/palette-service.client.ts`         | Browser entry — used by client components if needed                    |
| Create | `src/modules/palettes/actions/create-palette.ts`                  | Empty palette stub; redirect target is `/palettes/{id}/edit`           |
| Create | `src/modules/palettes/actions/update-palette.ts`                  | Updates name/description/is_public                                     |
| Create | `src/modules/palettes/actions/delete-palette.ts`                  | Hard delete; cascades to `palette_paints`                              |
| Create | `src/modules/palettes/utils/normalize-palette-positions.ts`       | Re-indexes positions after add/remove/reorder                          |
| Modify | `src/types/supabase.ts` (regenerated)                             | Picks up the new tables                                                |

## Implementation Plan

### 1. Migration

Create `supabase/migrations/{ts}_create_palettes_tables.sql` with timestamp ≥ `20260425000000`. The migration is the single source of truth for the schema; all DDL lives here.

1. **Reusable trigger function.** Earlier migrations maintain `updated_at` via plain `DEFAULT now()` columns with no trigger — `set_updated_at()` does not exist in the codebase yet. Create it once at the top of this migration so future features can reuse it:

   ```sql
   CREATE OR REPLACE FUNCTION public.set_updated_at()
   RETURNS trigger
   LANGUAGE plpgsql
   AS $$
   BEGIN
     NEW.updated_at = now();
     RETURN NEW;
   END;
   $$;
   ```

2. **`palettes` table.** Use the columns from the schema section. Inline length constraints:
   - `name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80)`
   - `description text CHECK (description IS NULL OR char_length(description) <= 1000)`
   - `user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE` (matches `user_paints` at `supabase/migrations/20260423000000_create_user_paints_table.sql`)

3. **`palette_paints` table.** Composite PK `(palette_id, position)`; `paint_id uuid NOT NULL REFERENCES public.paints (id) ON DELETE CASCADE` (matches `paint_references` at `supabase/migrations/20260413000000_create_paint_tables.sql`). Add `CHECK (position >= 0)` and `CHECK (note IS NULL OR char_length(note) <= 500)`.

4. **Indexes.** Add the three from the schema section. The partial index on `is_public = true` keeps the public browse query cheap.

5. **RLS.** `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on both tables. Match the existing policy-naming convention `"[Actor] can [action] [table]"` (see `20260413000000_create_paint_tables.sql` for examples). Distinct policies per `(role, operation)` so they're easy to drop in a follow-up:

   - `"Owners can view their palettes"` — `SELECT USING (auth.uid() = user_id)`
   - `"Anyone can view public palettes"` — `SELECT TO anon, authenticated USING (is_public = true)`
   - `"Users can create their palettes"` — `INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`
   - `"Owners can update their palettes"` — `UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
   - `"Owners can delete their palettes"` — `DELETE TO authenticated USING (auth.uid() = user_id)`

   For `palette_paints`, derive ownership through the parent palette using `EXISTS (SELECT 1 FROM public.palettes p WHERE p.id = palette_paints.palette_id AND (p.user_id = auth.uid() OR p.is_public = true))` for SELECT, and the same EXISTS clause restricted to `p.user_id = auth.uid()` for INSERT/UPDATE/DELETE.

6. **Trigger.** Attach `set_updated_at` to `palettes` `BEFORE UPDATE FOR EACH ROW`. `palette_paints` has no `updated_at` and needs no trigger.

7. **`replace_palette_paints` RPC** *(see step 6 — service layer)*. Define a SQL function in this same migration so `setPalettePaints` can run delete+insert atomically:

   ```sql
   CREATE OR REPLACE FUNCTION public.replace_palette_paints(
     p_palette_id uuid,
     p_rows jsonb
   ) RETURNS void
   LANGUAGE plpgsql SECURITY INVOKER
   AS $$ ... $$;
   ```

   Body validates ownership via `auth.uid()`, deletes existing rows, inserts the new ones, all inside the function (which runs as a single transaction). Without this RPC the supabase-js client cannot run the two statements atomically.

### 2. Regenerate Supabase types

Run `npm run db:types` (defined in `package.json` as `npx supabase gen types typescript --local > src/types/supabase.ts`). Confirm the new `palettes` and `palette_paints` table types appear in `src/types/supabase.ts` before continuing — every downstream import depends on this.

### 3. Scaffold the module

Create `src/modules/palettes/` with the directory structure from the **Domain Module** section. Match the file conventions of `src/modules/collection/`. Empty `components/` is fine for this feature — `01-palette-management` fills it in. Per `CLAUDE.md`, no barrel/index files.

### 4. Types

Each type lives in its own file with a JSDoc header.

- `types/palette-paint.ts` — `PalettePaint = { position: number; paintId: string; note: string | null; addedAt: string; paint?: ColorWheelPaint }`. Import `ColorWheelPaint` from `@/modules/color-wheel/types/color-wheel-paint`.
- `types/palette.ts` — `Palette = { id: string; userId: string; name: string; description: string | null; isPublic: boolean; createdAt: string; updatedAt: string; paints: PalettePaint[] }`.
- `types/palette-summary.ts` — slim browse-row shape: `{ id: string; name: string; isPublic: boolean; paintCount: number; swatches: string[]; updatedAt: string }`. `swatches` holds up to five hex previews.
- `types/palette-form-state.ts` — `useActionState` return shape: `{ values: { name: string; description: string; isPublic: boolean }; errors: { name?: string; description?: string; form?: string }; success?: boolean }`.

### 5. Validation

Create `validation.ts`. Match the `string | null` return convention from `src/modules/user/validation.ts:16`:

- `validatePaletteName(name: string): string | null` — required, trimmed, length 1–80.
- `validatePaletteDescription(desc: string): string | null` — optional, length 0–1000 after trim.
- `validatePaletteForm(input: { name: string; description: string }): { name?: string; description?: string }` — combines the two and returns the field errors map used by `PaletteFormState`.

### 6. Service layer

Mirror `src/modules/collection/services/collection-service.{ts,server.ts,client.ts}`.

- **`services/palette-service.ts`** — `export function createPaletteService(supabase: SupabaseClient)` returns an object of methods. Also export `export type PaletteService = ReturnType<typeof createPaletteService>`. Methods:
  - `getPaletteById(id)` → `Palette | null`. Single round-trip via `select('*, palette_paints(position, paint_id, note, added_at, paints(*, product_lines(*, brands(*))))')`. Map embedded `paints` rows to `ColorWheelPaint` shape; sort by `position` in JS (Supabase doesn't sort embeds reliably).
  - `listPalettesForUser(userId)` → `PaletteSummary[]` ordered by `updated_at desc`. Build `swatches` from the first 5 `palette_paints(paints(hex))` rows.
  - `listPublicPalettes({ limit = 24, offset = 0 })` → paginated `PaletteSummary[]` filtered by `is_public = true`, ordered by `updated_at desc`.
  - `createPalette({ userId, name, description, isPublic })` → `Palette`.
  - `updatePalette(id, patch)` → updated `Palette` (only `name`, `description`, `is_public`).
  - `deletePalette(id)` → `void`. Cascades to `palette_paints`.
  - `setPalettePaints(id, paints)` → `{ error?: string }`. Calls `supabase.rpc('replace_palette_paints', { p_palette_id: id, p_rows: rows })` from step 7 of the migration so the replace runs as one transaction.
- **`services/palette-service.server.ts`** — `export async function getPaletteService()` mirrors `collection-service.server.ts:10–13`; uses `@/lib/supabase/server`.
- **`services/palette-service.client.ts`** — `export function getPaletteService()` mirrors `collection-service.client.ts:10–12`; uses `@/lib/supabase/client`.

### 7. Actions

Each action gets its own file under `actions/` and follows the pattern of `src/modules/collection/actions/add-to-collection.ts:1–39`:

- Top-of-file `'use server'` directive.
- Import the server Supabase client and `createPaletteService` (or call `getPaletteService()` from `palette-service.server.ts`).
- Authenticate via `supabase.auth.getUser()`; return `{ error: 'You must be signed in.' }` (or the `PaletteFormState` equivalent) for anonymous callers.
- On success, `revalidatePath('/palettes')` and any relevant detail path.

Files:

- `actions/create-palette.ts` — `useActionState` action returning `PaletteFormState`. Defaults: `name = 'Untitled palette'`, `description = ''`, `isPublic = false`. Validates with `validatePaletteForm`; on success, `redirect('/palettes/${id}/edit')`.
- `actions/update-palette.ts` — accepts id + patch; validates; revalidates `/palettes` and `/palettes/${id}`.
- `actions/delete-palette.ts` — accepts id; deletes; redirects to `/palettes`.

### 8. Utility

`utils/normalize-palette-positions.ts` — pure helper:

```ts
export function normalizePalettePositions<T extends { position: number }>(rows: T[]): T[]
```

Sorts by current `position`, then re-numbers to `0..N-1`. Returns a new array. Every mutation that adds, removes, or reorders a slot calls this before persisting — the `(palette_id, position)` PK rejects duplicates otherwise.

### 9. Verify

Run `npm run lint` and `npm run build`. Both must pass with no errors. There is no UI in this feature, so no dev-server check is required — UI testing belongs to `01-palette-management`.

### Order of operations

1. Migration (step 1) — must land first; everything else depends on the schema.
2. `npm run db:types` (step 2).
3. Types → validation → service → actions → util (steps 3–8). Types are the trunk; everything imports from them.
4. Lint + build (step 9).

## Risks & Considerations

- **Position coherence**: `(palette_id, position)` as a composite PK enforces uniqueness but doesn't guarantee gaps don't appear after a row delete. `normalize-palette-positions` is the single owner of "renumber to 0..N-1"; every mutation that adds/removes a slot must call it before the write.
- **Public visibility**: `is_public = false` by default keeps unfinished palettes private. The community-feed feature can later extend `listPublicPalettes` with sort + filter; the index on `(is_public)` keeps that cheap.
- **Cascade behavior**: Deleting a palette cascades to its rows, which is what we want. Deleting a paint cascades to every palette row that referenced it — accept this for v1; a soft "this paint was removed" placeholder can come later if data integrity becomes an issue.
- **Same paint twice**: Allowed by design (recipes use the same shade at multiple steps). The PK on `(palette_id, position)` makes this work without duplicate-key headaches.
- **Future custom hex slots**: If we later want palettes to include non-database colors (e.g., a custom mix), add a nullable `custom_hex` column alongside `paint_id` plus a CHECK that exactly one is set. Out of scope here — calling it out so the schema doesn't need a rewrite.

## Notes

- This feature ships data + plumbing only; user-visible palette UI lands in `01-palette-management`.
- The migration timestamp must come after the most recent migration in `supabase/migrations/`. At time of writing the latest is `20260424000000_admin_user_paints_policies.sql`.
