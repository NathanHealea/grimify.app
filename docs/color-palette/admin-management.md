# Admin Management

**Epic:** Color Palette
**Type:** Feature
**Status:** Todo

## Summary

Provide administrator pages for managing all user palettes, projects, and tags. Administrators can view, edit, and delete any palette, project, or tag across all users. This builds on the existing admin route protection from the Role-Based Authorization feature.

## Acceptance Criteria

- [ ] Admin palettes page at `/admin/palettes` — list all palettes across all users
- [ ] Admin can filter palettes by user
- [ ] Admin can view and edit any palette (name, description, paints)
- [ ] Admin can delete any palette (with confirmation showing paint count)
- [ ] Admin projects page at `/admin/projects` — list all projects across all users
- [ ] Admin can filter projects by user
- [ ] Admin can view and edit any project (name, description, palettes)
- [ ] Admin can delete any project (with confirmation)
- [ ] Admin tags page at `/admin/tags` — list all tags across all users
- [ ] Admin can edit or delete any tag
- [ ] Admin can filter tags by user
- [ ] All admin pages are protected by middleware (require `administrator` role)
- [ ] Admin pages use the admin Supabase client for operations that bypass RLS

## Implementation Plan

### Step 1: Create admin palette management

**`src/app/admin/palettes/page.tsx`** — List all palettes with:
- User name/email column
- Palette name, paint count, created date
- Filter by user (search/dropdown)
- Edit and delete actions per row

**`src/app/admin/palettes/[id]/page.tsx`** — Edit a specific palette:
- Same UI as the user's palette detail page but with admin context
- Shows owner information
- Uses admin Supabase client for mutations

**`src/app/admin/palettes/actions.ts`** — Server actions:
- `adminGetPalettes(search?, userId?)` — list palettes with user info
- `adminUpdatePalette(paletteId, data)` — update any palette
- `adminDeletePalette(paletteId)` — delete any palette

### Step 2: Create admin project management

**`src/app/admin/projects/page.tsx`** — List all projects with user info, palette count, filter by user.

**`src/app/admin/projects/[id]/page.tsx`** — Edit a specific project.

**`src/app/admin/projects/actions.ts`** — Server actions for admin project CRUD.

### Step 3: Create admin tag management

**`src/app/admin/tags/page.tsx`** — List all tags across all users:
- User name, tag name, tag color, usage count (how many palettes/projects use it)
- Filter by user
- Inline edit (name, color) and delete actions

**`src/app/admin/tags/actions.ts`** — Server actions for admin tag CRUD.

### Step 4: Add navigation links

Update the admin layout or navigation to include links to:
- `/admin/palettes`
- `/admin/projects`
- `/admin/tags`

These join the existing admin pages (`/admin/users`, `/admin/collections`) from other features.

### Affected Files

| File | Changes |
|------|---------|
| `src/app/admin/palettes/page.tsx` | New — admin palette list |
| `src/app/admin/palettes/[id]/page.tsx` | New — admin palette edit |
| `src/app/admin/palettes/actions.ts` | New — admin palette server actions |
| `src/app/admin/projects/page.tsx` | New — admin project list |
| `src/app/admin/projects/[id]/page.tsx` | New — admin project edit |
| `src/app/admin/projects/actions.ts` | New — admin project server actions |
| `src/app/admin/tags/page.tsx` | New — admin tag list |
| `src/app/admin/tags/actions.ts` | New — admin tag server actions |

### Dependencies

- [Role-Based Authorization](../user-authentication/role-based-authorization.md) — middleware protection and admin client
- [Color Palettes](./color-palettes.md) — palettes tables and service
- [Projects](./projects.md) — projects tables and service
- [Tags](./tags.md) — tags tables and service

### Risks & Considerations

- **Admin operations should use the service role client** (`src/lib/supabase/admin.ts`) for mutations that need to bypass RLS, or rely on the admin RLS policies already defined in the palette/project/tag migrations.
- **Cascade awareness:** When an admin deletes a palette that belongs to projects, the `project_palettes` entries are cascade-deleted. The UI should warn about this.
- **Pagination:** If the platform grows to many users, the admin list pages will need pagination. For MVP, a simple list with search/filter is sufficient.
