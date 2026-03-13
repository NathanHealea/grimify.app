# Projects

**Epic:** Color Palette
**Type:** Feature
**Status:** Todo

## Summary

Allow users to create projects that group multiple color palettes together. A project represents a painting endeavor (e.g., "Blood Angels Army", "Terrain Board") and contains one or more palettes. Projects have a name, description, and optional tags. Users manage their own projects; administrators can manage any project.

## Acceptance Criteria

- [ ] `projects` table created with `id`, `user_id`, `name`, `description`, `created_at`, `updated_at`
- [ ] `project_palettes` join table linking projects to palettes with `position` (ordering)
- [ ] RLS policies: users can CRUD their own projects and project_palettes
- [ ] RLS policies: administrators can CRUD all projects and project_palettes
- [ ] Project type defined at `src/types/project.ts`
- [ ] Project service functions at `src/lib/supabase/projects.ts`
- [ ] Project list page at `/projects` showing the user's projects
- [ ] Create project page at `/projects/new`
- [ ] View/edit project page at `/projects/[id]` showing contained palettes
- [ ] Users can add/remove palettes to/from a project
- [ ] Users can reorder palettes within a project
- [ ] Users can delete a project (with confirmation) — does NOT delete contained palettes
- [ ] Project view shows aggregate owned count across all palettes

## Implementation Plan

### Step 1: Create database migration

**`supabase/migrations/{timestamp}_create_projects_tables.sql`**

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_palettes (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  palette_id UUID REFERENCES public.palettes(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, palette_id)
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_project_palettes_project_id ON public.project_palettes(project_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_palettes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User policies
CREATE POLICY "Users can read own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can read all projects"
  ON public.projects FOR SELECT TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update all projects"
  ON public.projects FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete all projects"
  ON public.projects FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

-- Project palettes: inherit access from project ownership
CREATE POLICY "Users can manage own project palettes"
  ON public.project_palettes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all project palettes"
  ON public.project_palettes FOR ALL TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));
```

### Step 2: Create project types

**`src/types/project.ts`**

```typescript
export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ProjectPalette {
  project_id: string
  palette_id: string
  position: number
}

export interface ProjectWithPalettes extends Project {
  palettes: (ProjectPalette & { palette: Palette })[]
}
```

### Step 3: Create project service

**`src/lib/supabase/projects.ts`**

- `getUserProjects(supabase, userId)` — list projects with palette counts
- `getProject(supabase, projectId)` — fetch project with palettes (ordered by position)
- `createProject(supabase, { name, description })` — create empty project
- `updateProject(supabase, projectId, { name, description })` — update metadata
- `deleteProject(supabase, projectId)` — delete project (does not delete palettes)
- `addPaletteToProject(supabase, projectId, paletteId)` — link palette
- `removePaletteFromProject(supabase, projectId, paletteId)` — unlink palette
- `reorderProjectPalettes(supabase, projectId, orderedPaletteIds)` — bulk update positions

### Step 4: Create project list page

**`src/app/projects/page.tsx`** — List the user's projects:
- Grid/list of project cards with name, description preview, palette count, tag badges
- "Create Project" button
- Each card links to `/projects/[id]`

### Step 5: Create project detail/edit page

**`src/app/projects/[id]/page.tsx`** — View and edit a single project:
- Project name and description (editable inline)
- List of contained palettes as expandable cards (show palette name, paint count, owned count)
- Add palette picker (dropdown of user's palettes not already in this project)
- Remove palette button per entry
- Reorder palettes (up/down buttons)
- Tag picker for managing project tags
- Aggregate stats: total paints across all palettes, total owned
- Delete project button with confirmation

### Step 6: Create project creation page

**`src/app/projects/new/page.tsx`** — Form with name, description, optional initial palette selection, and tags.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_projects_tables.sql` | New — projects, project_palettes tables with RLS |
| `src/types/project.ts` | New — Project, ProjectPalette types |
| `src/lib/supabase/projects.ts` | New — project CRUD service |
| `src/app/projects/page.tsx` | New — project list page |
| `src/app/projects/[id]/page.tsx` | New — project detail/edit page |
| `src/app/projects/new/page.tsx` | New — create project page |

### Dependencies

- [Supabase Setup](../user-authentication/supabase-setup.md) — Supabase client
- [User Profiles](../user-authentication/user-profiles.md) — `profiles` table
- [Role-Based Authorization](../user-authentication/role-based-authorization.md) — admin RLS policies
- [Color Palettes](./color-palettes.md) — `palettes` table must exist

### Risks & Considerations

- **Deleting a project does NOT delete its palettes** — palettes are standalone entities. The `ON DELETE CASCADE` on `project_palettes` only removes the join table entries. This is intentional — a palette can exist independently or belong to multiple projects.
- **A palette can belong to multiple projects** — the join table supports this naturally. The UI should make this clear.
- **Aggregate stats** — computing owned counts across all palettes in a project requires joining through multiple tables. Consider a database view or RPC function for performance if projects grow large.
