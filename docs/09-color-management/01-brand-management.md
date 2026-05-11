# Brand Management

**Epic:** Color Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/brand-management`
**Merge into:** `main`

## Summary

Provide an admin interface for managing paint brands and their product lines. Administrators can create, read, update, and delete brands and product lines. Deleting a brand cascades through product lines to paints (enforced by the database `ON DELETE CASCADE` constraint), so the UI must warn before destructive actions.

## Acceptance Criteria

- [ ] An admin brands list page at `/admin/brands` displays all brands with name, slug, paint count, and action links
- [ ] A create brand page at `/admin/brands/new` allows creating a new brand with name, slug, website URL, and logo URL
- [ ] An edit brand page at `/admin/brands/[id]` allows updating brand fields
- [ ] The edit brand page displays the brand's product lines with name, slug, and paint count
- [ ] Product lines can be created, edited, and deleted from the brand edit page
- [ ] Deleting a brand shows a confirmation dialog warning about cascading deletion of product lines and paints
- [ ] Deleting a product line shows a confirmation dialog warning about cascading deletion of paints
- [ ] Form validation prevents empty names and duplicate slugs
- [ ] Slugs are auto-generated from names but can be manually overridden
- [ ] Server actions handle all mutations (no direct client-side Supabase calls for writes)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Create brand server actions

Create server actions in `src/modules/admin/actions/`:

**`brand-actions.ts`** — Server actions for brand CRUD:
- `createBrand(prevState, formData)` — Insert into `brands` table, redirect to edit page on success
- `updateBrand(prevState, formData)` — Update `brands` row by ID
- `deleteBrand(prevState, formData)` — Delete `brands` row by ID (cascade handled by DB), redirect to list

**`product-line-actions.ts`** — Server actions for product line CRUD:
- `createProductLine(prevState, formData)` — Insert into `product_lines` with `brand_id`
- `updateProductLine(prevState, formData)` — Update `product_lines` row
- `deleteProductLine(prevState, formData)` — Delete `product_lines` row

Each action follows the existing pattern: validate input → perform DB operation → handle errors → `revalidatePath` → redirect.

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/actions/brand-actions.ts` | **New** — Brand CRUD server actions |
| `src/modules/admin/actions/product-line-actions.ts` | **New** — Product line CRUD server actions |

### Step 2: Create brand form state types

Create `src/modules/admin/types/brand-form-state.ts`:

```typescript
export type BrandFormState = {
  errors?: {
    name?: string
    slug?: string
    website_url?: string
  }
  error?: string
  success?: boolean
} | null
```

Create `src/modules/admin/types/product-line-form-state.ts` similarly.

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/types/brand-form-state.ts` | **New** — Brand form state type |
| `src/modules/admin/types/product-line-form-state.ts` | **New** — Product line form state type |

### Step 3: Create brand form components

**`src/modules/admin/components/brand-form.tsx`** — Client component with:
- `useActionState` bound to `createBrand` or `updateBrand`
- Fields: name (text), slug (text, auto-derived), website URL (url), logo URL (url)
- Slug auto-generation from name (with manual override)
- Field-level error display from server action state
- Submit button with pending state

**`src/modules/admin/components/product-line-form.tsx`** — Client component for creating/editing product lines within the brand edit page.

**`src/modules/admin/components/delete-brand-button.tsx`** — Client component with confirmation dialog before deletion.

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/components/brand-form.tsx` | **New** — Brand create/edit form |
| `src/modules/admin/components/product-line-form.tsx` | **New** — Product line create/edit form |
| `src/modules/admin/components/delete-brand-button.tsx` | **New** — Delete brand with confirmation |

### Step 4: Create brand admin pages

**`src/app/admin/brands/page.tsx`** — Server component:
- Fetches all brands using `getAllBrands()` from brand service
- Renders a table with columns: Name, Slug, Paints, Actions (Edit, Delete)
- "Create Brand" button linking to `/admin/brands/new`

**`src/app/admin/brands/new/page.tsx`** — Server component:
- Renders the brand form in create mode

**`src/app/admin/brands/[id]/page.tsx`** — Server component:
- Fetches brand by ID and its product lines
- Renders the brand form in edit mode with current values
- Below the form, renders the product lines table with inline create/edit/delete

#### Affected Files

| File | Changes |
|------|---------|
| `src/app/admin/brands/page.tsx` | **New** — Brand list page |
| `src/app/admin/brands/new/page.tsx` | **New** — Create brand page |
| `src/app/admin/brands/[id]/page.tsx` | **New** — Edit brand page with product lines |

### Step 5: Extend brand service with admin queries

Add methods to the brand service (or create admin-specific service methods) for:
- `getBrandWithProductLineCounts(id)` — Brand + product lines with paint counts per line
- Any additional queries needed for the admin views

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/brands/services/brand-service.ts` | **Modify** — Add admin query methods |

### Risks & Considerations

- **Cascade deletion** — Deleting a brand removes all its product lines and paints. The confirmation dialog must clearly communicate the scope of deletion (e.g., "This will delete 3 product lines and 341 paints").
- **Slug uniqueness** — Brands have globally unique slugs; product lines have slugs unique within their brand. The auto-slug generation must handle collisions gracefully.
- **No undo** — Deletions are permanent. Consider soft-delete in the future, but for now, clear warnings are sufficient.
- **Existing seed data** — The 5 brands and their product lines are seeded. Admin CRUD will work alongside seeded data.
