# Paint Management

**Epic:** Color Management
**Type:** Feature
**Status:** Completed
**Branch:** `feature/paint-management`
**Merge into:** `main`

## Summary

Provide an admin interface for managing individual paints. Administrators can create, edit, and delete paints with full color data management. When editing a paint, hue assignments (parent hue and child sub-hue) can be added or removed with constraint enforcement: a paint cannot have a child hue unless the child's parent hue is the one associated, and setting a parent hue is required before selecting a child sub-hue. RGB and HSL values are automatically computed from the hex value.

## Acceptance Criteria

- [x] An admin paints list page at `/admin/paints` displays paints with color swatch, name, brand, product line, hue assignment, and action links
- [x] The paints list supports search by name and filtering by brand
- [x] The paints list supports pagination
- [x] A create paint page at `/admin/paints/new` allows creating a new paint with all required fields
- [x] An edit paint page at `/admin/paints/[id]` allows updating all paint fields
- [x] RGB (`r`, `g`, `b`) and HSL (`hue`, `saturation`, `lightness`) values are automatically computed when the hex value changes
- [x] Hue assignment uses a two-step selection: first select a parent hue, then optionally select a child sub-hue within that parent
- [x] A child sub-hue cannot be selected without first selecting its parent hue
- [x] Changing the parent hue clears any previously selected child sub-hue (if it doesn't belong to the new parent)
- [x] Removing the parent hue also removes any child sub-hue assignment
- [x] The hue assignment is stored as `hue_id` pointing to the child sub-hue (when both parent and child are selected) or to the parent hue (when only parent is selected)
- [x] Deleting a paint shows a confirmation dialog warning about cascade deletion of paint references
- [x] The product line dropdown is filtered by the selected brand
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

**Target module:** `src/modules/admin` (paint CRUD), with thin route pages under `src/app/admin/paints/`. Reads brand/product-line data from `src/modules/brands` and hue data from `src/modules/hues` via their server services. Shared color math lives in `src/lib/color-utils.ts`.

The core CRUD flow is **already built and type-clean**. The remaining work is small: completing the list-page columns (AC #1, the only unchecked criterion) and adding the cascade warning to the delete dialog. Phases below are ordered so each ships green types and lint.

### Already Implemented (Done)

| Area | File | Notes |
|------|------|-------|
| Color utilities | `src/lib/color-utils.ts` | `hexToRgb`, `rgbToHsl` extracted and shared. |
| Slug helper | `src/modules/admin/utils/to-slug.ts` | Used by create/update actions. |
| Server actions | `src/modules/admin/actions/paint-actions.ts` | `createPaint`, `updatePaint`, `deletePaint`. Validate required fields (name, hex 6-digit, product_line_id, brand_paint_id), compute RGB/HSL, auto-slug, enforce the child-belongs-to-parent hue constraint server-side, derive `hue_id` (child when both selected, else parent), revalidate `/admin/paints`, redirect/return success. Duplicate-slug → field error. |
| Form state type | `src/modules/admin/types/paint-form-state.ts` | `PaintFormState` with field-level + form-level errors. |
| Paint form | `src/modules/admin/components/paint-form.tsx` | `useActionState`, brand → product-line cascade (preloaded), live hex swatch + native color picker + computed RGB/HSL readout, auto-slug with manual-override, metallic/discontinued flags, paint type, embeds `HueSelector`. |
| Hue selector | `src/modules/admin/components/hue-selector.tsx` | Two-step parent → child dropdowns, child disabled until parent chosen, parent change clears non-matching child, hidden `parent_hue_id` / `child_hue_id` inputs, swatch previews. |
| Delete button | `src/modules/admin/components/delete-paint-button.tsx` | Native `<dialog>` confirmation bound to `deletePaint`. |
| New page | `src/app/admin/paints/new/page.tsx` | Loads brands-with-product-lines + parent hues + child-hue map; renders form in create mode. |
| Edit page | `src/app/admin/paints/[id]/page.tsx` | Loads paint by id with relations, dropdown data, renders form in edit mode + Danger Zone delete card. |
| List page (partial) | `src/app/admin/paints/page.tsx` | Search-by-name, brand filter, pagination (50/page), swatch/name/brand/type columns, "New Paint" link. |
| Brand service | `src/modules/brands/services/brand-service.ts` | `getAllBrandsWithProductLines()` and `getAllBrands()` already present. |
| Paint search | `src/modules/paints/services/paint-service.ts` | `searchPaints({ search, brandId, limit, offset })` returns paints + count; selects `product_lines!inner(brands(name))`. |

### Phase 1 — Complete the paints list columns (AC #1)

The list page exists but does not yet satisfy AC #1: it has **no Hue column**, and its "Product Line" column actually renders `paint.slug` because `searchPaints` does not select the product-line name or the hue relation.

- **`src/modules/paints/services/paint-service.ts`** (`services/`) — Widen the `searchPaints` data-query select to include the product-line name and the assigned hue:
  - Change the select from `*, product_lines!inner(brands(name))` to also pull `product_lines(name)` and `hues(name, hex_code)` (keep the `!inner` join when `brandId` filtering is active so the brand filter still works).
  - Extend the row type returned by `searchPaints` (or the existing `PaintWithRelations`/list-row type in `types/`) so `product_lines.name` and the `hues` relation are typed — one type per file, JSDoc each field including the `null` hue state.
- **`src/app/admin/paints/page.tsx`** (route page, thin) — Update the table to match AC #1 columns exactly: Swatch, Name, Brand, **Product Line** (render `product_lines.name`, not `slug`), **Hue** (render hue name + small swatch, or "—" when unassigned), Type, Actions. No business logic in the page — only read from the widened service result.

Ships green: type change + presentational update only.

### Phase 2 — Cascade warning in delete confirmation (AC #11 wording)

AC #11 requires the delete confirmation to **warn about cascade deletion of paint references**. The current dialog only says "This action cannot be undone."

- **`src/modules/admin/components/delete-paint-button.tsx`** (`components/`) — Add explicit copy to the dialog body stating that deleting the paint will also remove all of its paint references (recipe/collection/comparison references) via `ON DELETE CASCADE`, and that this cannot be undone. Pure copy/markup change; no action or type changes.

Ships green: presentational only.

### Phase 3 — Verification

- Run `npm run build` and `npm run lint`; resolve any issues (AC: build + lint pass).
- Manually exercise: create → edit (hex recompute, hue constraint clearing) → delete (cascade warning) and confirm the list page shows Brand, Product Line, and Hue correctly with search + brand filter + pagination.

#### Affected Files (remaining work)

| File | Phase | Changes |
|------|-------|---------|
| `src/modules/paints/services/paint-service.ts` | 1 | **Modify** — Widen `searchPaints` select to include product-line name + hue relation; update return type. |
| `src/modules/paints/types/*` | 1 | **Modify/New** — Extend or add the list-row type for product-line name + hue. |
| `src/app/admin/paints/page.tsx` | 1 | **Modify** — Render Product Line (name) and add Hue column per AC #1. |
| `src/modules/admin/components/delete-paint-button.tsx` | 2 | **Modify** — Add cascade-deletion warning copy. |

### Risks & Considerations

- **Brand filter join** — `searchPaints` uses `product_lines!inner` only when `brandId` is set so the brand filter keeps working. When widening the select, preserve the conditional `!inner` vs. plain join so unfiltered queries still return paints whose product line happens to be absent from the inner-join set.
- **Hue null state** — A paint's `hue_id` may be null, or point to a parent or child hue. The list Hue column must handle the null case ("—") and render whatever the joined `hues` row provides.
- **`hue_id` storage decision** — When both parent and child hue are selected, `hue_id` points to the child sub-hue; when only a parent is selected, it points to the parent. This is already implemented in the actions and the edit form's `defaultParentHueId`/`defaultChildHueId` derivation; the list join must follow the same single `hue_id` reference.
- **Hex validation** — Already enforced (`/^[0-9a-fA-F]{6}$/`, `#` stripped/normalized). No change needed.
- **Paint list performance** — Pagination (50/page) is already in place via `searchPaints` `limit`/`offset`; widening the select adds two joined columns and should not materially affect performance.
