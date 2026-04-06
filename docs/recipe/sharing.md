# Sharing

**Epic:** Recipe
**Type:** Feature
**Status:** Todo

## Summary

Allow users to share their recipes and projects via public links. A shared recipe or project is accessible to anyone with the link, even unauthenticated users. Sharing is toggle-based — users can enable or disable sharing on any recipe or project they own. Shared items are read-only for viewers.

Shared recipes display the full step-by-step painting guide, making it easy for hobbyists to share their painting process with the community — similar to how recipes are shared on forums, Reddit, and in the Citadel Colour app.

## Acceptance Criteria

- [ ] `recipes` table has `is_shared` boolean column (default false) and `share_token` UUID
- [ ] `projects` table has `is_shared` boolean column (default false) and `share_token` UUID
- [ ] RLS policies: anyone can read shared recipes/projects via share token
- [ ] Users can toggle sharing on/off for their own recipes and projects
- [ ] When sharing is enabled, a shareable URL is generated and displayed
- [ ] Shared recipe page at `/shared/recipe/[token]` — read-only view
- [ ] Shared project page at `/shared/project/[token]` — read-only view with contained recipes
- [ ] Shared recipe view shows steps with technique badges, paint swatches, names, brands, and notes — no edit controls
- [ ] Shared views show "owned" indicators if the viewer is authenticated and has those paints
- [ ] Users can copy the share link to clipboard
- [ ] Disabling sharing invalidates the existing link (regenerates token on re-enable)

## Implementation Plan

### Step 1: Add sharing columns migration

**`supabase/migrations/{timestamp}_add_sharing_columns.sql`**

```sql
ALTER TABLE public.recipes
  ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN share_token UUID UNIQUE DEFAULT gen_random_uuid();

ALTER TABLE public.projects
  ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN share_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Public read access for shared items (no auth required)
CREATE POLICY "Anyone can read shared recipes"
  ON public.recipes FOR SELECT
  USING (is_shared = true);

CREATE POLICY "Anyone can read shared recipe steps"
  ON public.recipe_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_id AND r.is_shared = true
    )
  );

CREATE POLICY "Anyone can read shared projects"
  ON public.projects FOR SELECT
  USING (is_shared = true);

CREATE POLICY "Anyone can read shared project recipes"
  ON public.project_recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.is_shared = true
    )
  );
```

### Step 2: Add sharing service functions

**`src/lib/supabase/sharing.ts`**

- `toggleRecipeSharing(supabase, recipeId, enabled)` — set `is_shared`, regenerate `share_token` if re-enabling
- `toggleProjectSharing(supabase, projectId, enabled)` — same for projects
- `getSharedRecipe(supabase, shareToken)` — fetch recipe with steps by token (public, no auth)
- `getSharedProject(supabase, shareToken)` — fetch project with recipes by token (public, no auth)

### Step 3: Add sharing toggle to recipe and project detail pages

**`src/app/recipes/[id]/page.tsx`** and **`src/app/projects/[id]/page.tsx`**:
- Add a "Share" toggle button in the page header
- When enabled, show the shareable URL with a "Copy Link" button
- URL format: `{origin}/shared/recipe/{share_token}` or `{origin}/shared/project/{share_token}`

### Step 4: Create shared recipe page

**`src/app/shared/recipe/[token]/page.tsx`** — Public read-only view:
- Fetch recipe via share token (no auth required)
- Display recipe name, model area, description, owner display name
- List steps in order with: step number, technique badge, color swatch, paint name, brand, note
- If viewer is authenticated, show owned/not-owned indicators
- No edit controls (no delete, reorder, or note editing)
- 404 if token is invalid or sharing is disabled

### Step 5: Create shared project page

**`src/app/shared/project/[token]/page.tsx`** — Public read-only view:
- Fetch project via share token
- Display project name, description, owner display name
- List contained recipes as expandable sections, each showing model area and steps
- If viewer is authenticated, show owned indicators
- 404 if invalid

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_add_sharing_columns.sql` | New — sharing columns and public RLS policies |
| `src/lib/supabase/sharing.ts` | New — sharing service functions |
| `src/app/recipes/[id]/page.tsx` | Add sharing toggle and share link display |
| `src/app/projects/[id]/page.tsx` | Add sharing toggle and share link display |
| `src/app/shared/recipe/[token]/page.tsx` | New — public shared recipe view |
| `src/app/shared/project/[token]/page.tsx` | New — public shared project view |

### Dependencies

- [Recipes](./recipes.md) — recipes table must exist
- [Projects](./projects.md) — projects table must exist
- [Cloud Paint Collection](../paint-collection/cloud-paint-collection.md) — for owned indicators on shared views (optional)

### Risks & Considerations

- **Token security:** Share tokens are UUIDs — unguessable but not secret. Anyone with the link can view. This is the standard approach for "anyone with the link" sharing (like Google Docs).
- **Token regeneration:** When sharing is disabled then re-enabled, a new token is generated. This invalidates any previously shared links, which is intentional for security.
- **SEO/Crawling:** Shared recipe pages could be indexed by search engines. This could be beneficial for discoverability (hobbyists searching for painting guides). Consider adding structured data (JSON-LD) for recipe-like content.
- **Rate limiting:** Shared pages are public and unauthenticated. If abuse is a concern, Supabase rate limiting or Next.js middleware rate limiting can be added later.
- **Shared recipe steps RLS:** The public read policy on `recipe_steps` checks the parent recipe's `is_shared` flag. This avoids exposing steps from non-shared recipes.
