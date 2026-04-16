# Hue Management

**Epic:** Color Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/hue-management`
**Merge into:** `v1/main`

## Summary

Provide an admin interface for managing the Munsell hue hierarchy (parent hues and ISCC-NBS child sub-hues) and their associations with paints. Administrators can create, edit, and delete hues at both levels. When viewing or editing a hue, all paints associated with that hue are visible and can be disassociated individually or in bulk. Paints can also be added to a hue from the hue edit page. Deleting a hue cascades: the database sets `hue_id = NULL` on all associated paints (via `ON DELETE SET NULL`).

## Acceptance Criteria

- [ ] An admin hues list page at `/admin/hues` displays all parent hues with name, hex swatch, slug, child hue count, and associated paint count
- [ ] Clicking a parent hue navigates to `/admin/hues/[id]` showing the parent hue details and its child sub-hues
- [ ] Parent hues can be created, edited, and deleted
- [ ] Child sub-hues can be created, edited, and deleted from the parent hue detail page
- [ ] The hue edit page displays all paints associated with that hue (for parent hues: paints associated with any of its child hues)
- [ ] Individual paint-hue associations can be removed (sets `hue_id = NULL` on the paint)
- [ ] Bulk removal of paint-hue associations is supported (select multiple paints, remove all at once)
- [ ] Paints can be added to a hue from the hue edit page (search/select paints, assign the hue)
- [ ] Deleting a parent hue warns that all child hues and paint associations will be removed
- [ ] Deleting a child hue warns that paint associations will be removed
- [ ] Hex color swatches are displayed next to hue names throughout the admin interface
- [ ] Form validation prevents empty names and duplicate slugs within scope
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Create hue server actions

Create `src/modules/admin/actions/hue-actions.ts`:

- `createHue(prevState, formData)` — Insert a new hue (parent or child based on `parent_id` field)
- `updateHue(prevState, formData)` — Update hue name, slug, hex_code, sort_order
- `deleteHue(prevState, formData)` — Delete hue by ID (DB cascades: child hues deleted, paint hue_id set to NULL)
- `removePaintHueAssociation(prevState, formData)` — Set `hue_id = NULL` on a single paint
- `bulkRemovePaintHueAssociations(prevState, formData)` — Set `hue_id = NULL` on multiple paints by IDs
- `addPaintsToHue(prevState, formData)` — Set `hue_id` on selected paints to the given hue ID

Each action validates input, performs the DB operation via Supabase client, handles errors, and calls `revalidatePath`.

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/actions/hue-actions.ts` | **New** — Hue CRUD and paint-hue association server actions |

### Step 2: Create hue form state types

Create `src/modules/admin/types/hue-form-state.ts`:

```typescript
export type HueFormState = {
  errors?: {
    name?: string
    slug?: string
    hex_code?: string
    sort_order?: string
  }
  error?: string
  success?: boolean
} | null
```

Create `src/modules/admin/types/paint-hue-action-state.ts` for association actions:

```typescript
export type PaintHueActionState = {
  error?: string
  success?: boolean
  removed_count?: number
} | null
```

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/types/hue-form-state.ts` | **New** — Hue form state type |
| `src/modules/admin/types/paint-hue-action-state.ts` | **New** — Paint-hue association action state type |

### Step 3: Create hue form components

**`src/modules/admin/components/hue-form.tsx`** — Client component for creating/editing a hue:
- Fields: name, slug (auto-derived), hex_code (with color picker/swatch preview), sort_order (for parent hues only)
- `parent_id` passed as hidden field when creating a child hue
- Slug auto-generation from name

**`src/modules/admin/components/hue-paint-list.tsx`** — Client component displaying paints associated with a hue:
- Table with columns: checkbox, color swatch, name, brand, paint type
- Select all / deselect all
- "Remove Selected" bulk action button
- Individual "Remove" action per row
- Uses `useActionState` for removal actions

**`src/modules/admin/components/add-paints-to-hue.tsx`** — Client component for adding paints to a hue:
- Search input to find paints by name
- Displays search results with checkboxes
- "Add Selected to Hue" button
- Filters out paints already associated with this hue

**`src/modules/admin/components/delete-hue-button.tsx`** — Client component with confirmation dialog:
- Shows count of child hues (if parent) and associated paints that will be affected
- Requires confirmation before deletion

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/components/hue-form.tsx` | **New** — Hue create/edit form |
| `src/modules/admin/components/hue-paint-list.tsx` | **New** — Paint-hue association management list |
| `src/modules/admin/components/add-paints-to-hue.tsx` | **New** — Add paints to hue component |
| `src/modules/admin/components/delete-hue-button.tsx` | **New** — Delete hue with confirmation |

### Step 4: Create hue admin pages

**`src/app/admin/hues/page.tsx`** — Server component:
- Fetches all parent hues using `getHues()` from hue service
- For each parent hue, fetches child count and associated paint count
- Renders a table with columns: Swatch, Name, Slug, Child Hues, Paints, Actions
- "Create Hue" button

**`src/app/admin/hues/[id]/page.tsx`** — Server component:
- Fetches the hue by ID
- If parent hue: shows details, child sub-hues list, and aggregated associated paints
- If child hue: shows details and directly associated paints
- Renders the hue edit form, child hue management (if parent), and paint association management

**`src/app/admin/hues/new/page.tsx`** — Server component:
- Renders the hue form in create mode
- Optional `parent_id` query param for creating child hues

#### Affected Files

| File | Changes |
|------|---------|
| `src/app/admin/hues/page.tsx` | **New** — Hue list page |
| `src/app/admin/hues/[id]/page.tsx` | **New** — Hue detail/edit page with paint associations |
| `src/app/admin/hues/new/page.tsx` | **New** — Create hue page |

### Step 5: Extend hue and paint services

Add methods for admin queries:

**Hue service additions:**
- `getHueWithChildCount(id)` — Hue with count of children
- `getHueWithPaintCount(id)` — Hue with count of associated paints

**Paint service additions:**
- `getPaintsWithoutHue(options)` — Paints where `hue_id IS NULL` (useful for the "add paints to hue" flow)

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/hues/services/hue-service.ts` | **Modify** — Add admin query methods |
| `src/modules/paints/services/paint-service.ts` | **Modify** — Add `getPaintsWithoutHue` method |

### Risks & Considerations

- **Cascade on parent hue deletion** — Deleting a parent hue cascades to delete all child hues (`ON DELETE CASCADE`), and each child hue's deletion sets `hue_id = NULL` on associated paints (`ON DELETE SET NULL`). The confirmation dialog must communicate the full impact.
- **Bulk operations performance** — Removing hue associations from many paints at once requires an `UPDATE paints SET hue_id = NULL WHERE id IN (...)` query. For large selections, this should be efficient with the existing indexes.
- **Paint search for "add to hue"** — The search component needs to be responsive. Consider debouncing the search input and limiting results.
- **Hex color input** — The hex_code field should support both manual entry and a color picker. Use an HTML `<input type="color">` alongside the text input for convenience.
- **Sort order** — Parent hues have a `sort_order` for display ordering. The admin should be able to change sort order. Child hues inherit their parent's sort order context.
