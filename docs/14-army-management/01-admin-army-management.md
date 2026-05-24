# Admin Army Management

**Epic:** Army Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/admin-army-management`
**Merge Into:** `epic/army-management`

## Summary

Give administrators a full CRUD interface for managing the hierarchical army list from the admin dashboard — including a tree-indented list view, a create/edit form with parent selector, and safe deletion that blocks removal of armies with children or palette associations.

## Acceptance Criteria

- [ ] `/admin/armies` lists all armies in a hierarchical indented tree (root → children → grandchildren)
- [ ] Each row shows the army name, its parent (if any), and action buttons (edit, delete)
- [ ] `/admin/armies/new` renders a form to create a new army with name, slug (auto-generated, editable), optional parent, and optional sort order
- [ ] `/admin/armies/[id]` renders the same form pre-filled for editing
- [ ] Creating or editing an army validates uniqueness of slug at the correct level (top-level or within parent)
- [ ] Deleting an army with children shows an error and does not delete
- [ ] Deleting an army linked to one or more palettes shows a warning (or is blocked, per decision)
- [ ] Admin sidebar includes an "Armies" navigation link
- [ ] The army create/edit form includes an icon upload field that writes to the `army-icons` Supabase storage bucket
- [ ] Uploaded icons are displayed as a thumbnail preview in the form and in the army list
- [ ] All new actions, components, and types have JSDoc comments

## Implementation Plan

### 1. Validation (`src/modules/armies/validation.ts`)

Define a Zod schema (or plain validation) for the army form:
- `name`: 1–100 characters, required
- `slug`: 1–100 characters, lowercase, hyphens only (`/^[a-z0-9-]+$/`), required
- `parent_id`: optional UUID string (null for root)
- `sort_order`: optional integer ≥ 0

### 2. Icon upload action (`src/modules/armies/actions/upload-army-icon.ts`)

A server action (or client-side upload using the Supabase JS client) that:
1. Accepts a `File` from the form's icon input
2. Uploads to the `army-icons` storage bucket under the path `{army-id}/{filename}`
3. Returns the public URL via `supabase.storage.from('army-icons').getPublicUrl(...)`
4. The URL is then saved to `armies.icon_url` as part of the create or update action

The icon upload can be invoked before or after the army record is saved. If uploading on create, generate a temporary UUID for the path; replace with the real army ID on success.

### 3. Army actions (`src/modules/armies/actions/`)

**`create-army.ts`** — server action that:
1. Validates form data against the validation schema
2. Checks slug uniqueness at the correct level (queries DB before insert)
3. Inserts into `armies` table
4. Revalidates `/admin/armies`
5. Redirects to `/admin/armies`

**`update-army.ts`** — server action that:
1. Validates form data
2. Checks slug uniqueness (excluding the current army's own row)
3. Guards against circular parent assignment (walks up the tree to confirm the proposed `parent_id` is not a descendant of the army being edited)
4. Updates the row
5. Revalidates `/admin/armies` and `/admin/armies/[id]`

**`delete-army.ts`** — server action that:
1. Queries child count: `SELECT COUNT(*) FROM armies WHERE parent_id = $id`
2. If children exist, returns an error state — does not delete
3. Queries palette count: `SELECT COUNT(*) FROM palettes WHERE army_id = $id`
4. If palettes exist, returns a warning and requires confirmation (or blocks — decide at implementation time based on UX preference)
5. Deletes the army row
6. Revalidates `/admin/armies`

### 3. Army parent selector component (`src/modules/armies/components/army-parent-selector.tsx`)

A dropdown (using the project's `<Select>` primitive) that lists all armies as selectable parents. When editing an existing army, it must exclude the army itself and all its descendants from the options list (to prevent circular references). Display format: indented label with ancestry breadcrumb (e.g., `Imperium › Space Marines`).

Props: `armies: ArmyNode[]`, `defaultValue?: string`, `name: string`, `excludeId?: string`.

### 4. Army form component (`src/modules/armies/components/army-form.tsx`)

Reusable create/edit form. Props: `mode: 'create' | 'edit'`, `army?: Army`, `armies: ArmyNode[]`.

Fields:
- **Name** — text input; on change, auto-populate slug if slug is unmodified
- **Slug** — text input (editable); auto-generates from name (lowercase, spaces → hyphens, strip non-alphanumeric)
- **Parent** — `<ArmyParentSelector>` (optional; null = root army)
- **Sort order** — number input (optional)
- **Icon** — file input (accepts `image/*`); on selection shows an `<img>` thumbnail preview next to the input. On submit, the file is uploaded to the `army-icons` bucket via `upload-army-icon` and the resulting URL is written to the `icon_url` field. When editing an existing army that already has an `icon_url`, display the current icon as the initial preview.

Renders a submit button labeled "Create Army" or "Save Changes" based on mode. Uses `useActionState` from React 19.

### 5. Admin list component (`src/modules/armies/components/army-tree-list.tsx`)

Renders an `ArmyNode[]` tree as an indented HTML list or table. Each row:
- Indented by depth level (CSS padding-left based on depth)
- Shows: icon thumbnail (if set), army name, parent name (or "—" for roots), sort order, Edit / Delete buttons
- Delete button triggers `delete-army` action; shows inline error if children exist

### 6. Admin pages

**`src/app/admin/armies/page.tsx`**
- Calls `armyService.getArmyTree()` (server component)
- Renders `<PageHeader>` + `<ArmyTreeList armies={tree} />`
- "Add Army" button links to `/admin/armies/new`

**`src/app/admin/armies/new/page.tsx`**
- Calls `armyService.getAllArmiesFlat()` to populate the parent selector
- Renders `<PageHeader>` + `<ArmyForm mode="create" armies={armyTree} />`

**`src/app/admin/armies/[id]/page.tsx`**
- Calls `armyService.getArmyById(id)` and `armyService.getAllArmiesFlat()`
- 404s if army not found
- Renders `<PageHeader>` + `<ArmyForm mode="edit" army={army} armies={armyTree} />`

### 7. Admin sidebar update

Add an "Armies" nav item to `src/modules/admin/components/admin-sidebar.tsx` after the existing items. The href is `/admin/armies`.

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/armies/validation.ts` | New — Zod schema for army form |
| `src/modules/armies/actions/upload-army-icon.ts` | New — upload icon to army-icons bucket, return public URL |
| `src/modules/armies/actions/create-army.ts` | New — create server action |
| `src/modules/armies/actions/update-army.ts` | New — update server action |
| `src/modules/armies/actions/delete-army.ts` | New — delete server action with child guard |
| `src/modules/armies/components/army-form.tsx` | New — create/edit form |
| `src/modules/armies/components/army-parent-selector.tsx` | New — parent dropdown (excludes descendants) |
| `src/modules/armies/components/army-tree-list.tsx` | New — hierarchical list for admin |
| `src/app/admin/armies/page.tsx` | New — army list page |
| `src/app/admin/armies/new/page.tsx` | New — army create page |
| `src/app/admin/armies/[id]/page.tsx` | New — army edit page |
| `src/modules/admin/components/admin-sidebar.tsx` | Modify — add Armies nav item |

### Risks & Considerations

- **Circular reference guard**: When updating `parent_id`, the action must walk the existing tree upward from the proposed parent to confirm it never encounters the army being edited. A simple recursive DB check or an in-memory walk after `getAllArmiesFlat()` works.
- **Delete and palettes**: Decide at implementation time whether to block deletion when palettes reference the army (safest) or allow with `SET NULL` (loses association silently). If the DB FK uses `ON DELETE SET NULL`, soft-block is optional — but blocking is more explicit for the admin.
- **Slug auto-generation**: Use the same pattern as hue slugs (lowercase, spaces to hyphens, strip punctuation). Preview the generated slug next to the name field before the user submits.
- **Form state**: Use `useActionState` from React 19 for server action responses, matching the pattern used by `hue-form.tsx` and `brand-form.tsx`.
- **Icon upload timing**: Uploading before the army record exists means the storage path won't have a real army ID. Use a pre-generated UUID for both the insert and the storage path to keep them in sync — generate the ID in the create action and pass it to the upload helper.
- **Stale icons**: When an admin replaces an existing icon, delete the old file from storage before uploading the new one to avoid orphaned objects in the `army-icons` bucket.
