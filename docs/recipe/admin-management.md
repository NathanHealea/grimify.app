# Admin Management

**Epic:** Recipe
**Type:** Feature
**Status:** Todo

## Summary

Provide administrator pages for managing all user recipes, projects, and tags. Administrators can view, edit, and delete any recipe, project, or tag across all users. This builds on the existing admin route protection from the Role-Based Authorization feature.

## Acceptance Criteria

- [ ] Admin recipes page at `/admin/recipes` — list all recipes across all users
- [ ] Admin can filter recipes by user
- [ ] Admin can view and edit any recipe (name, model area, description, steps)
- [ ] Admin can delete any recipe (with confirmation showing step count)
- [ ] Admin projects page at `/admin/projects` — list all projects across all users
- [ ] Admin can filter projects by user
- [ ] Admin can view and edit any project (name, description, recipes)
- [ ] Admin can delete any project (with confirmation)
- [ ] Admin tags page at `/admin/tags` — list all tags across all users
- [ ] Admin can edit or delete any tag
- [ ] Admin can filter tags by user
- [ ] All admin pages are protected by middleware (require `administrator` role)
- [ ] Admin pages use the admin Supabase client for operations that bypass RLS

## Implementation Plan

### Step 1: Create admin recipe management

**`src/app/admin/recipes/page.tsx`** — List all recipes with:
- User name/email column
- Recipe name, model area, step count, created date
- Filter by user (search/dropdown)
- Edit and delete actions per row

**`src/app/admin/recipes/[id]/page.tsx`** — Edit a specific recipe:
- Same UI as the user's recipe detail page but with admin context
- Shows owner information
- Uses admin Supabase client for mutations

**`src/app/admin/recipes/actions.ts`** — Server actions:
- `adminGetRecipes(search?, userId?)` — list recipes with user info
- `adminUpdateRecipe(recipeId, data)` — update any recipe
- `adminDeleteRecipe(recipeId)` — delete any recipe

### Step 2: Create admin project management

**`src/app/admin/projects/page.tsx`** — List all projects with user info, recipe count, filter by user.

**`src/app/admin/projects/[id]/page.tsx`** — Edit a specific project.

**`src/app/admin/projects/actions.ts`** — Server actions for admin project CRUD.

### Step 3: Create admin tag management

**`src/app/admin/tags/page.tsx`** — List all tags across all users:
- User name, tag name, tag color, usage count (how many recipes/projects use it)
- Filter by user
- Inline edit (name, color) and delete actions

**`src/app/admin/tags/actions.ts`** — Server actions for admin tag CRUD.

### Step 4: Add navigation links

Update the admin layout or navigation to include links to:
- `/admin/recipes`
- `/admin/projects`
- `/admin/tags`

These join the existing admin pages (`/admin/users`, `/admin/collections`) from other features.

### Affected Files

| File | Changes |
|------|---------|
| `src/app/admin/recipes/page.tsx` | New — admin recipe list |
| `src/app/admin/recipes/[id]/page.tsx` | New — admin recipe edit |
| `src/app/admin/recipes/actions.ts` | New — admin recipe server actions |
| `src/app/admin/projects/page.tsx` | New — admin project list |
| `src/app/admin/projects/[id]/page.tsx` | New — admin project edit |
| `src/app/admin/projects/actions.ts` | New — admin project server actions |
| `src/app/admin/tags/page.tsx` | New — admin tag list |
| `src/app/admin/tags/actions.ts` | New — admin tag server actions |

### Dependencies

- [Role-Based Authorization](../user-authentication/role-based-authorization.md) — middleware protection and admin client
- [Recipes](./recipes.md) — recipes tables and service
- [Projects](./projects.md) — projects tables and service
- [Tags](./tags.md) — tags tables and service

### Risks & Considerations

- **Admin operations should use the service role client** (`src/lib/supabase/admin.ts`) for mutations that need to bypass RLS, or rely on the admin RLS policies already defined in the recipe/project/tag migrations.
- **Cascade awareness:** When an admin deletes a recipe that belongs to projects, the `project_recipes` entries are cascade-deleted. The UI should warn about this.
- **Pagination:** If the platform grows to many users, the admin list pages will need pagination. For MVP, a simple list with search/filter is sufficient.
