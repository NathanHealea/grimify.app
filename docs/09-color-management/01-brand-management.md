# Brand Management

**Epic:** Color Management
**Type:** Feature
**Status:** Done
**Branch:** `feature/brand-management`
**Merge into:** `main`

## Summary

Provide an admin interface for managing paint brands and their product lines. Administrators can create, read, update, and delete brands and product lines. Deleting a brand cascades through product lines to paints (enforced by the database `ON DELETE CASCADE` constraint), so the UI must warn before destructive actions.

## Acceptance Criteria

- [x] An admin brands list page at `/admin/brands` displays all brands with name, slug, paint count, and action links
- [x] A create brand page at `/admin/brands/new` allows creating a new brand with name, slug, website URL, and logo URL
- [x] An edit brand page at `/admin/brands/[id]` allows updating brand fields
- [x] The edit brand page displays the brand's product lines with name, slug, and paint count
- [x] Product lines can be created, edited, and deleted from the brand edit page
- [x] Deleting a brand shows a confirmation dialog warning about cascading deletion of product lines and paints
- [x] Deleting a product line shows a confirmation dialog warning about cascading deletion of paints
- [x] Form validation prevents empty names and duplicate slugs
- [x] Slugs are auto-generated from names but can be manually overridden
- [x] Server actions handle all mutations (no direct client-side Supabase calls for writes)
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

**Target module:** `src/modules/admin` (actions, components, types, validation) with admin route pages under `src/app/admin/brands` and admin queries on the existing `src/modules/brands` service. The brand CRUD path is fully built; the remaining work is wiring product-line *editing* into the brand detail page (`updateProductLine` exists but has no UI).

### Already Implemented

The following is complete and shipping with passing `npm run build` / `npm run lint`:

**Actions** (`src/modules/admin/actions/`)
- `brand-actions.ts` — `createBrand`, `updateBrand`, `deleteBrand` with validation, slug-uniqueness (`23505`) handling, `revalidatePath`, and redirects.
- `product-line-actions.ts` — `createProductLine`, `updateProductLine`, `deleteProductLine`. All three read `brand_id`/`id` from hidden fields, validate name + slug pattern, handle duplicate-slug errors, and revalidate the brand detail page. **`updateProductLine` is implemented but not yet called by any UI.**

**Types** (`src/modules/admin/types/`)
- `brand-form-state.ts` (`BrandFormState`), `product-line-form-state.ts` (`ProductLineFormState`).

**Components** (`src/modules/admin/components/`)
- `brand-form.tsx` — create/edit form with `useActionState`, slug auto-generation + manual override, field-level errors, pending state.
- `product-line-form.tsx` — supports both `create` and `edit` modes already (accepts `defaultValues`, renders hidden `id`, toggles button labels). Currently only mounted in `create` mode.
- `delete-brand-button.tsx` and `delete-product-line-button.tsx` — confirmation dialogs warning about cascading deletion.

**Service** (`src/modules/brands/services/brand-service.ts`)
- `getBrandWithProductLineCounts(id)` — brand + product lines with per-line paint counts.

**Route pages** (`src/app/admin/brands/`)
- `page.tsx` (list), `new/page.tsx` (create), `[id]/page.tsx` (edit). The detail page renders the brand form, a product-lines table (Name / Slug / Paints / Actions), an "Add Product Line" create form, and a Danger Zone delete card. The table's only action today is **delete**.

### Remaining Work

#### Phase 1: Editable product lines on the brand detail page

Wire the already-built `updateProductLine` action and `ProductLineForm` edit mode into the product-lines table so each row can be edited inline, satisfying the one open acceptance criterion (create + edit + delete from the brand edit page).

**components/** (`src/modules/admin/components/`)
- **New** `edit-product-line-row.tsx` — client component owning a single product-line row's view/edit toggle. Renders the read-only cells (name, slug, paint count) plus an "Edit" button; when toggled, swaps in `ProductLineForm` bound to `updateProductLine` (`mode="edit"`, `defaultValues={productLine}`) alongside the existing `DeleteProductLineButton`. Collapse back to read-only on `state.success`. Keep this purely presentational/stateful — no DB access; it composes the existing form + delete button. Add JSDoc to the component and its props type.
  - Alternative (simpler) if a separate component is undesirable: lift the per-row expand/collapse state into `[id]/page.tsx`. Prefer the dedicated client component to keep the route page thin per project conventions.

**types/** (`src/modules/admin/types/`)
- No new types required. If `EditProductLineRow` needs a prop shape beyond the existing `ProductLine` type, define it inline in the component file (props types are co-located, not separate type files).

**route** (`src/app/admin/brands/[id]/page.tsx`)
- Replace the inline `<tr>` map body's action cell so each row renders `<EditProductLineRow productLine={pl} brandId={brand.id} />` (the new component renders the full `<tr>` or the row's cells). Import `updateProductLine` inside the client component, not the server page, so the page stays a server component.
- No service changes needed — `getBrandWithProductLineCounts` already supplies `id`, `name`, `slug`, and `paint_count` per line.

Ships green: the new component reuses existing actions/forms; types and lint remain clean.

#### Phase 2: Verification

- Manually exercise create / edit / delete of a product line from `/admin/brands/[id]`, confirming revalidation refreshes the table and counts.
- Confirm duplicate-slug-within-brand and empty-name validation surface on the edit form (already enforced server-side).
- Re-run `npm run build` and `npm run lint`.
- Check off the open acceptance criterion (product lines can be created, edited, and deleted from the brand edit page).

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/components/edit-product-line-row.tsx` | **New** — Inline view/edit toggle for a product-line table row, composing `ProductLineForm` (edit mode) + `DeleteProductLineButton` |
| `src/app/admin/brands/[id]/page.tsx` | **Modify** — Render `EditProductLineRow` per product line so rows support inline editing |

### Risks & Considerations

- **Cascade deletion** — Deleting a brand removes all its product lines and paints. The confirmation dialog must clearly communicate the scope of deletion (e.g., "This will delete 3 product lines and 341 paints").
- **Slug uniqueness** — Brands have globally unique slugs; product lines have slugs unique within their brand. The auto-slug generation must handle collisions gracefully.
- **No undo** — Deletions are permanent. Consider soft-delete in the future, but for now, clear warnings are sufficient.
- **Existing seed data** — The 5 brands and their product lines are seeded. Admin CRUD will work alongside seeded data.
