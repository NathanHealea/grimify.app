# Itten Hue Self-Referencing Refactor

**Epic:** Paint Data & Search
**Type:** Refactor
**Status:** Completed

## Summary

Merge the `colors` table into `itten_hues` as a self-referencing hierarchy. Instead of two separate tables (`itten_hues` for hue groups and `colors` for named colors within a group), a single `itten_hues` table uses a `parent_id` column to express the relationship. Top-level hues (Red, Blue, Neutral, etc.) have `parent_id = NULL`. Named colors (Crimson, Navy, Beige, etc.) have `parent_id` pointing to their parent hue row.

### Before

```
itten_hues (13 rows)          colors (72 rows)
  id                            id
  name                          name
  hex_code                      hex_code
  sort_order                    itten_hue_id → itten_hues.id

paints
  itten_hue_id → itten_hues.id   (top-level hue group)
  color_id     → colors.id       (specific named color)
```

### After

```
itten_hues (85 rows = 13 hues + 72 colors)
  id
  parent_id    → itten_hues.id   (NULL for top-level hues)
  name
  hex_code
  sort_order                     (top-level hues: 1-13, colors: NULL)

paints
  itten_hue_id → itten_hues.id   (points to color-level row)
                                  (parent hue derived via parent_id)
```

The `colors` table and `paints.color_id` column are dropped.

## Motivation

- **Simpler data model** — one table instead of two for the same conceptual hierarchy (hue > color).
- **Extensible depth** — colors could theoretically have sub-colors in the future without schema changes.
- **Single FK on paints** — paints reference one row in `itten_hues` instead of maintaining two separate FKs that must stay in sync.
- **Unified queries** — fetching a hue's children or a color's parent is a single self-join rather than a cross-table join.

## Acceptance Criteria

- [x] `itten_hues` table has a `parent_id` column (uuid, nullable, self-referencing FK)
- [x] All 72 existing color rows are present in `itten_hues` with `parent_id` set to their former `itten_hue_id`
- [x] All 13 top-level hues retain their existing stable UUIDs and have `parent_id = NULL`
- [x] `paints.itten_hue_id` points to the color-level row (formerly `color_id` target)
- [x] `paints.color_id` column is removed
- [x] `colors` table is dropped
- [x] `IttenHue` TypeScript type includes `parent_id: string | null`
- [x] `Color` TypeScript type is removed; all code uses `IttenHue`
- [x] Color service methods are updated: `getColorsByHueId` → `getChildHues`, `getColorById` → `getIttenHueById` (already exists)
- [x] Paint service methods are updated: `getPaintsByColorId` → uses `itten_hue_id`, `color_id` references removed
- [x] All route pages (`/paints`, `/paints/group/[id]`, `/colors/[id]`) work correctly with the new model
- [x] `/colors/[id]` route still functions (now queries `itten_hues` instead of `colors`)
- [x] RLS policies on `itten_hues` cover the merged rows (existing policies already allow public SELECT)
- [x] `npm run build` and `npm run lint` pass with no errors

## Database Changes

### `itten_hues` table — add `parent_id`

```sql
ALTER TABLE public.itten_hues
  ADD COLUMN parent_id uuid REFERENCES public.itten_hues (id) ON DELETE CASCADE;

CREATE INDEX idx_itten_hues_parent_id ON public.itten_hues (parent_id);
```

### Migrate color rows into `itten_hues`

```sql
INSERT INTO public.itten_hues (id, name, hex_code, sort_order, parent_id)
SELECT id, name, hex_code, NULL, itten_hue_id
FROM public.colors;
```

This preserves the existing color UUIDs so `paints.color_id` values remain valid during migration.

### Update `paints.itten_hue_id` to point to color-level rows

```sql
UPDATE public.paints
SET itten_hue_id = color_id
WHERE color_id IS NOT NULL;
```

After this, `itten_hue_id` points to the specific color row (now in `itten_hues`), and the parent hue group is derivable via `parent_id`.

### Drop `paints.color_id` and `colors` table

```sql
ALTER TABLE public.paints DROP COLUMN color_id;

DROP TABLE public.colors;
```

### Remove `UNIQUE` constraint on `name` or make it conditional

The `itten_hues.name` column currently has a `UNIQUE` constraint. Some top-level hue names collide with color names (e.g., "Red" exists as both a hue and a color, "Green", "Blue", "Orange", "Yellow", "Violet"). Options:

**Option A — Drop the UNIQUE constraint.** Names are display labels, not lookup keys. All queries use UUIDs.

```sql
ALTER TABLE public.itten_hues DROP CONSTRAINT itten_hues_name_key;
```

**Option B — Rename colliding color rows** to differentiate (e.g., "Red" color becomes "Pure Red"). This preserves uniqueness but changes display names.

**Recommended: Option A.** Dropping the unique constraint is simpler and avoids inventing new names. Rows are always queried by `id`, never by `name`.

## TypeScript Type Changes

### `src/types/color.ts`

```typescript
// BEFORE
export type IttenHue = {
  id: string
  name: string
  hex_code: string
  sort_order: number
  created_at: string
}

export type Color = {
  id: string
  name: string
  hex_code: string
  itten_hue_id: string | null
  created_at: string
}

// AFTER
export type IttenHue = {
  id: string
  parent_id: string | null
  name: string
  hex_code: string
  sort_order: number | null
  created_at: string
}

// Color type removed — use IttenHue with parent_id != null
```

### `src/types/paint.ts`

Remove the `color_id` field from the `Paint` type.

## Service Changes

### Color service (`src/modules/colors/services/color-service.ts`)

| Current method | New method | Change |
|---|---|---|
| `getIttenHues()` | `getIttenHues()` | Add `.is('parent_id', null)` filter to return only top-level hues |
| `getIttenHueById(id)` | `getIttenHueById(id)` | No change — works for both hues and colors |
| `getAllColors()` | Remove | Unused after refactor; if needed, query `.not('parent_id', 'is', null)` |
| `getColorsByHueId(hueId)` | `getChildHues(parentId)` | Query `itten_hues` where `parent_id = parentId` |
| `getColorById(id)` | Remove | Covered by `getIttenHueById(id)` |

### Paint service (`src/modules/paints/services/paint-service.ts`)

| Current method | New method | Change |
|---|---|---|
| `getPaintsByColorId(colorId, opts)` | `getPaintsByIttenHueId(hueId, opts)` | Already exists — `color_id` queries become `itten_hue_id` queries |
| `getPaintCountByColorId(colorId)` | Remove | Use existing `getPaintCountsByIttenHue([id])` |
| `getPaintsByIttenHueId(hueId, opts)` | `getPaintsByIttenHueId(hueId, opts)` | For top-level hue pages, query paints where `itten_hue_id` IN child hue IDs |
| `getPaintCountsByIttenHue(hueIds)` | `getPaintCountsByIttenHue(hueIds)` | No change — counts paints per hue ID |

**Key query change for hue group pages:** When showing all paints for a top-level hue (e.g., "Red"), the query must find all child hue IDs first, then fetch paints matching any of those IDs:

```typescript
async getPaintsByHueGroup(parentHueId: string, opts?) {
  // 1. Get child hue IDs
  const { data: children } = await supabase
    .from('itten_hues')
    .select('id')
    .eq('parent_id', parentHueId)

  const childIds = children?.map(c => c.id) ?? []

  // 2. Fetch paints matching any child
  return supabase
    .from('paints')
    .select('*, product_lines(brands(name))')
    .in('itten_hue_id', childIds)
    .order('name')
    .range(...)
}
```

## Component Changes

| Component | Change |
|---|---|
| `itten-hue-card.tsx` | No change — still receives `IttenHue` and `paintCount` |
| `color-card.tsx` | Accept `IttenHue` instead of `Color` (same fields minus `itten_hue_id`, plus `parent_id`) |
| `color-paint-grid.tsx` | Rename to `hue-paint-grid.tsx` or reuse `hue-group-paint-grid.tsx`; fetch by `itten_hue_id` |
| `paginated-paint-grid.tsx` | No change — already generic |

## Route Changes

| Route | Change |
|---|---|
| `/paints` | No change — still fetches top-level hues |
| `/paints/group/[id]` | Fetch children via `getChildHues(id)` instead of `getColorsByHueId(id)`. Paint grid uses `getPaintsByHueGroup(id)` |
| `/colors/[id]` | Fetch `getIttenHueById(id)` from `itten_hues`. Paint grid uses `getPaintsByIttenHueId(id)`. Breadcrumb derives parent via `parent_id` |

## Migration Order

The migration must be a single transaction to keep data consistent:

1. Add `parent_id` column to `itten_hues`
2. Drop `UNIQUE` constraint on `itten_hues.name`
3. Insert all `colors` rows into `itten_hues` with `parent_id` set
4. Update `paints.itten_hue_id` to point to color-level rows (from `color_id`)
5. Drop `paints.color_id` column and its index
6. Drop `colors` table (cascade drops its indexes, RLS policies, and FK constraints)
7. Create index on `itten_hues.parent_id`

## Application Code Order

After the migration is applied:

1. Update `IttenHue` type — add `parent_id`, make `sort_order` nullable, remove `Color` type
2. Update `Paint` type — remove `color_id`
3. Update color service — add `parent_id` filter to `getIttenHues()`, rename `getColorsByHueId` to `getChildHues`, remove `getColorById` and `getAllColors`
4. Update paint service — remove `getPaintsByColorId` and `getPaintCountByColorId`, add `getPaintsByHueGroup` for top-level hue pages
5. Update `color-card.tsx` — accept `IttenHue` instead of `Color`
6. Update `/paints/group/[id]` page — use `getChildHues` and `getPaintsByHueGroup`
7. Update `/colors/[id]` page — use `getIttenHueById` and derive parent for breadcrumbs
8. Update seed generator if it generates color/hue seed data
9. Run build and lint to verify

## Risks & Considerations

- **Name collisions** — 6 names exist in both tables (Red, Orange, Yellow, Green, Blue, Violet). The plan drops the UNIQUE constraint. If name uniqueness is needed later, a composite unique on `(name, parent_id)` could be added.
- **Existing color UUIDs preserved** — Colors keep their UUIDs when moved into `itten_hues`, so any external references or bookmarked URLs (`/colors/[id]`) continue to work.
- **Two-step hue group queries** — Fetching paints for a top-level hue now requires a child lookup first. This adds one lightweight query but keeps the data model normalized. Could be optimized with a database view or function if needed.
- **Seed data** — The migration SQL in `20260414000000_create_itten_hues_and_colors.sql` and `supabase/seed.sql` both need updating to reflect the merged table. The seed generator script should also be updated.
- **Sort order semantics** — Top-level hues have `sort_order` (1-13). Color-level rows have `sort_order = NULL`. Queries for top-level hues filter by `parent_id IS NULL` and order by `sort_order`. Child queries order by `name`.
