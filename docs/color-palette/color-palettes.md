# Color Palettes

**Epic:** Color Palette
**Type:** Feature
**Status:** Todo

## Summary

Allow authenticated users to create, edit, and delete named color palettes. A palette is a curated collection of paints that a user assembles for a specific purpose (e.g., "Space Marine Blue Armor", "NMM Gold Recipe"). Each palette has a name, optional description, and a list of paints. Paints in a palette are ordered and can include notes (e.g., "base coat", "highlight"). Users manage their own palettes; administrators can manage any palette.

## Acceptance Criteria

- [ ] `palettes` table created with `id`, `user_id`, `name`, `description`, `created_at`, `updated_at`
- [ ] `palette_paints` join table linking palettes to paints with `position` (ordering) and `note` (optional text)
- [ ] RLS policies: users can CRUD their own palettes and palette_paints
- [ ] RLS policies: administrators can CRUD all palettes and palette_paints
- [ ] Palette type defined at `src/types/palette.ts`
- [ ] Palette service functions at `src/lib/supabase/palettes.ts`
- [ ] Palette list page at `/palettes` showing the user's palettes
- [ ] Create palette page at `/palettes/new`
- [ ] View/edit palette page at `/palettes/[id]`
- [ ] Users can add paints to a palette from the DetailPanel (color wheel)
- [ ] Users can reorder paints within a palette
- [ ] Users can add notes to individual paints in a palette
- [ ] Users can delete a palette (with confirmation)
- [ ] Each paint in a palette shows owned/not-owned indicator based on the user's collection
- [ ] Palette view shows count of owned vs total paints ("You own 5/8 paints")

## Implementation Plan

### Step 1: Create database migration

**`supabase/migrations/{timestamp}_create_palettes_tables.sql`**

```sql
CREATE TABLE public.palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.palette_paints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id UUID REFERENCES public.palettes(id) ON DELETE CASCADE NOT NULL,
  paint_id TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  note TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_palettes_user_id ON public.palettes(user_id);
CREATE INDEX idx_palette_paints_palette_id ON public.palette_paints(palette_id);
CREATE UNIQUE INDEX idx_palette_paints_unique ON public.palette_paints(palette_id, paint_id);

ALTER TABLE public.palettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.palette_paints ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp
CREATE TRIGGER palettes_updated_at
  BEFORE UPDATE ON public.palettes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User policies
CREATE POLICY "Users can read own palettes"
  ON public.palettes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own palettes"
  ON public.palettes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own palettes"
  ON public.palettes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own palettes"
  ON public.palettes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can read all palettes"
  ON public.palettes FOR SELECT TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update all palettes"
  ON public.palettes FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete all palettes"
  ON public.palettes FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

-- Palette paints: inherit access from palette ownership
CREATE POLICY "Users can manage own palette paints"
  ON public.palette_paints FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all palette paints"
  ON public.palette_paints FOR ALL TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));
```

### Step 2: Create palette types

**`src/types/palette.ts`**

```typescript
export interface Palette {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface PalettePaint {
  id: string
  palette_id: string
  paint_id: string
  position: number
  note: string | null
  added_at: string
}

export interface PaletteWithPaints extends Palette {
  paints: PalettePaint[]
}
```

### Step 3: Create palette service

**`src/lib/supabase/palettes.ts`**

- `getUserPalettes(supabase, userId)` — list all palettes with paint counts
- `getPalette(supabase, paletteId)` — fetch palette with paints (ordered by position)
- `createPalette(supabase, { name, description })` — create empty palette
- `updatePalette(supabase, paletteId, { name, description })` — update metadata
- `deletePalette(supabase, paletteId)` — delete palette (cascade deletes paints)
- `addPaintToPalette(supabase, paletteId, paintId, note?)` — add paint at end
- `removePaintFromPalette(supabase, palettePaintId)` — remove paint entry
- `updatePalettePaint(supabase, palettePaintId, { position, note })` — reorder or update note
- `reorderPalettePaints(supabase, paletteId, orderedIds)` — bulk update positions

### Step 4: Create palette list page

**`src/app/palettes/page.tsx`** — Server component listing the user's palettes:
- Grid/list of palette cards with name, description preview, paint count, tag badges
- "Create Palette" button
- Each card links to `/palettes/[id]`
- Empty state: "No palettes yet. Create your first palette to start organizing your paints."

### Step 5: Create palette detail/edit page

**`src/app/palettes/[id]/page.tsx`** — View and edit a single palette:
- Palette name and description (editable inline)
- Ordered list of paints with color swatch, name, brand, owned indicator, note field
- Drag-to-reorder or up/down buttons for paint ordering
- Remove paint button per entry
- "Add Paint" action that navigates to the color wheel with a palette context
- Owned vs total count display ("You own 5/8 paints")
- Tag picker for managing palette tags
- Delete palette button with confirmation

### Step 6: Create palette creation page

**`src/app/palettes/new/page.tsx`** — Simple form with name, description, and optional initial tags. On submit, creates palette and redirects to the detail page.

### Step 7: Add "Add to Palette" action in DetailPanel

**`src/components/DetailPanel.tsx`** — Add an "Add to Palette" button below the collection toggle when a paint is selected. Clicking opens a dropdown/modal listing the user's palettes. Selecting a palette adds the paint to it.

This requires passing palettes data and an `onAddToPalette` callback through props.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_palettes_tables.sql` | New — palettes, palette_paints tables with RLS |
| `src/types/palette.ts` | New — Palette, PalettePaint types |
| `src/lib/supabase/palettes.ts` | New — palette CRUD service |
| `src/app/palettes/page.tsx` | New — palette list page |
| `src/app/palettes/[id]/page.tsx` | New — palette detail/edit page |
| `src/app/palettes/new/page.tsx` | New — create palette page |
| `src/components/DetailPanel.tsx` | Add "Add to Palette" button and palette picker |
| `src/app/page.tsx` | Pass palette context to DetailPanel |

### Dependencies

- [Supabase Setup](../user-authentication/supabase-setup.md) — Supabase client
- [User Profiles](../user-authentication/user-profiles.md) — `profiles` table referenced by `user_id`
- [Role-Based Authorization](../user-authentication/role-based-authorization.md) — admin RLS policies
- [Cloud Paint Collection](../paint-collection/cloud-paint-collection.md) — owned paint data for owned/not-owned indicators

### Risks & Considerations

- **Paint ID format:** `palette_paints.paint_id` uses the same TEXT format as `user_paint_collection.paint_id` (`${brand}-${name}-${type}`). If paint data migration changes IDs, both tables need updating.
- **Reordering:** Drag-and-drop reordering in the palette detail page adds complexity. For MVP, simple up/down buttons may be sufficient. Consider a library like `@dnd-kit/core` if drag-and-drop is desired.
- **Navigation flow:** Adding a paint to a palette from the color wheel requires navigating between the wheel and palette pages, or using a modal/dropdown overlay. The modal approach keeps the user on the wheel.
- **`update_updated_at` function:** Reuses the trigger function from the profiles migration. Ensure it exists before this migration runs.
