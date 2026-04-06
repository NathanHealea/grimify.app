# Tags

**Epic:** Recipe
**Type:** Feature
**Status:** Todo

## Summary

Create a tagging system that allows users to organize their recipes and projects with custom labels. Tags are user-scoped — each user manages their own tags. Administrators can view and manage all tags across users. Tags are stored in Supabase and linked to recipes and projects via join tables.

## Acceptance Criteria

- [ ] `tags` table created with `id`, `user_id`, `name`, `color` (optional hex for visual label), `created_at`
- [ ] `recipe_tags` join table linking recipes to tags (many-to-many)
- [ ] `project_tags` join table linking projects to tags (many-to-many)
- [ ] RLS policies: users can CRUD their own tags
- [ ] RLS policies: administrators can CRUD all tags
- [ ] Tag type defined at `src/types/tag.ts`
- [ ] Tag service functions at `src/lib/supabase/tags.ts` (CRUD operations)
- [ ] Reusable `TagPicker` component for selecting/creating tags inline
- [ ] Reusable `TagBadge` component for displaying tags
- [ ] Deleting a tag removes it from all associated recipes and projects (cascade)

## Implementation Plan

### Step 1: Create database migration

**`supabase/migrations/{timestamp}_create_tags_tables.sql`**

```sql
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE public.recipe_tags (
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE public.project_tags (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

CREATE INDEX idx_tags_user_id ON public.tags(user_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own tags
CREATE POLICY "Users can read own tags"
  ON public.tags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON public.tags FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can CRUD all tags
CREATE POLICY "Admins can read all tags"
  ON public.tags FOR SELECT TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update all tags"
  ON public.tags FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete all tags"
  ON public.tags FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

-- Join table policies (inherited from parent ownership)
CREATE POLICY "Users can manage own recipe tags"
  ON public.recipe_tags FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own project tags"
  ON public.project_tags FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all recipe tags"
  ON public.recipe_tags FOR ALL TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can manage all project tags"
  ON public.project_tags FOR ALL TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));
```

**Note:** This migration must run after the recipes and projects tables are created. The join tables reference `public.recipes` and `public.projects`.

### Step 2: Create tag type

**`src/types/tag.ts`**

```typescript
export interface Tag {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
}
```

### Step 3: Create tag service

**`src/lib/supabase/tags.ts`**

- `getUserTags(supabase, userId)` — fetch all tags for a user
- `createTag(supabase, { name, color })` — create a new tag
- `updateTag(supabase, tagId, { name, color })` — update a tag
- `deleteTag(supabase, tagId)` — delete a tag (cascades to join tables)
- `addTagToRecipe(supabase, recipeId, tagId)` — link tag to recipe
- `removeTagFromRecipe(supabase, recipeId, tagId)` — unlink tag from recipe
- `addTagToProject(supabase, projectId, tagId)` — link tag to project
- `removeTagFromProject(supabase, projectId, tagId)` — unlink tag from project

### Step 4: Create reusable UI components

**`src/components/TagBadge.tsx`** — Small colored pill displaying a tag name. Accepts `tag`, optional `onRemove` callback for editable contexts.

**`src/components/TagPicker.tsx`** — Dropdown/combobox for selecting existing tags or creating new ones inline. Uses Headless UI `Combobox`. Accepts `selectedTags`, `onTagsChange`, and fetches the user's tags from Supabase.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_tags_tables.sql` | New — tags, recipe_tags, project_tags tables with RLS |
| `src/types/tag.ts` | New — Tag type |
| `src/lib/supabase/tags.ts` | New — tag CRUD service functions |
| `src/components/TagBadge.tsx` | New — tag display component |
| `src/components/TagPicker.tsx` | New — tag selection/creation component |

### Dependencies

- [Supabase Setup](../user-authentication/supabase-setup.md) — Supabase client
- [Role-Based Authorization](../user-authentication/role-based-authorization.md) — `get_user_roles()` for admin RLS
- [Recipes](./recipes.md) — `recipes` table must exist for join table
- [Projects](./projects.md) — `projects` table must exist for join table

### Risks & Considerations

- The `UNIQUE(user_id, name)` constraint prevents duplicate tag names per user but allows different users to have tags with the same name.
- Tag colors are optional — the UI should have a sensible default (e.g., gray badge) when no color is set.
- The join table migration depends on both `recipes` and `projects` tables existing. If implementing tags before projects, create the `project_tags` table in the projects migration instead.
