# Paint Management

**Epic:** Color Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/paint-management`
**Merge into:** `main`

## Summary

Provide an admin interface for managing individual paints. Administrators can create, edit, and delete paints with full color data management. When editing a paint, hue assignments (parent hue and child sub-hue) can be added or removed with constraint enforcement: a paint cannot have a child hue unless the child's parent hue is the one associated, and setting a parent hue is required before selecting a child sub-hue. RGB and HSL values are automatically computed from the hex value.

## Acceptance Criteria

- [ ] An admin paints list page at `/admin/paints` displays paints with color swatch, name, brand, product line, hue assignment, and action links
- [ ] The paints list supports search by name and filtering by brand
- [ ] The paints list supports pagination
- [ ] A create paint page at `/admin/paints/new` allows creating a new paint with all required fields
- [ ] An edit paint page at `/admin/paints/[id]` allows updating all paint fields
- [ ] RGB (`r`, `g`, `b`) and HSL (`hue`, `saturation`, `lightness`) values are automatically computed when the hex value changes
- [ ] Hue assignment uses a two-step selection: first select a parent hue, then optionally select a child sub-hue within that parent
- [ ] A child sub-hue cannot be selected without first selecting its parent hue
- [ ] Changing the parent hue clears any previously selected child sub-hue (if it doesn't belong to the new parent)
- [ ] Removing the parent hue also removes any child sub-hue assignment
- [ ] The hue assignment is stored as `hue_id` pointing to the child sub-hue (when both parent and child are selected) or to the parent hue (when only parent is selected)
- [ ] Deleting a paint shows a confirmation dialog warning about cascade deletion of paint references
- [ ] The product line dropdown is filtered by the selected brand
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Create paint server actions

Create `src/modules/admin/actions/paint-actions.ts`:

- `createPaint(prevState, formData)` — Insert a new paint with all fields computed:
  - Validate required fields (name, hex, product_line_id)
  - Compute RGB from hex
  - Compute HSL from RGB
  - Auto-generate slug from name
  - Enforce hue constraint: if `child_hue_id` is set, verify it belongs to the selected parent hue
  - Insert into `paints` table
  - Redirect to edit page on success

- `updatePaint(prevState, formData)` — Update a paint:
  - Recompute RGB/HSL if hex changed
  - Enforce hue constraint
  - Update the `paints` row

- `deletePaint(prevState, formData)` — Delete a paint by ID (cascades paint_references)

Each action follows the `useActionState` pattern with field-level errors.

#### Color Computation Logic

```typescript
// Hex → RGB
function hexToRgb(hex: string): { r: number; g: number; b: number }

// RGB → HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }
```

These utilities already exist in `scripts/generate-seed.ts`. Extract them into a shared utility at `src/lib/color-utils.ts` for reuse in both the seed generator and server actions.

#### Hue Constraint Validation

```typescript
// Server-side validation in paint actions:
if (childHueId) {
  // Fetch the child hue to verify its parent_id
  const childHue = await supabase
    .from('hues')
    .select('parent_id')
    .eq('id', childHueId)
    .single()

  if (!childHue.data) {
    return { errors: { hue: 'Invalid child hue' } }
  }

  // The selected parent hue must match the child's actual parent
  if (childHue.data.parent_id !== parentHueId) {
    return { errors: { hue: 'Child hue does not belong to the selected parent hue' } }
  }
}
```

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/actions/paint-actions.ts` | **New** — Paint CRUD server actions |
| `src/lib/color-utils.ts` | **New** — Shared hex/RGB/HSL conversion utilities |

### Step 2: Create paint form state types

Create `src/modules/admin/types/paint-form-state.ts`:

```typescript
export type PaintFormState = {
  errors?: {
    name?: string
    slug?: string
    hex?: string
    brand_id?: string
    product_line_id?: string
    hue?: string
    brand_paint_id?: string
  }
  error?: string
  success?: boolean
} | null
```

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/types/paint-form-state.ts` | **New** — Paint form state type |

### Step 3: Create paint form components

**`src/modules/admin/components/paint-form.tsx`** — Client component for creating/editing a paint:
- Fields:
  - Name (text, required)
  - Slug (text, auto-derived from name)
  - Brand (select dropdown, required) — populated from brands list
  - Product Line (select dropdown, required) — filtered by selected brand, dynamically updated
  - Brand Paint ID (text, required) — the brand's internal paint identifier
  - Hex (text with color preview swatch, required) — on change, computes and displays RGB and HSL
  - Is Metallic (checkbox)
  - Is Discontinued (checkbox)
  - Paint Type (text)
  - Parent Hue (select dropdown, optional) — populated from parent hues
  - Child Sub-Hue (select dropdown, optional) — populated from child hues of the selected parent; disabled when no parent is selected
- Color preview: live swatch that updates as hex changes
- RGB/HSL display: read-only computed values shown below hex input
- `useActionState` bound to `createPaint` or `updatePaint`

**`src/modules/admin/components/hue-selector.tsx`** — Client component for the two-step hue selection:
- Parent hue dropdown (all 11 parent hues + empty option)
- Child sub-hue dropdown (children of selected parent + empty option)
- Changing parent clears child if the current child doesn't belong to the new parent
- Removing parent clears child
- Hidden inputs for `parent_hue_id` and `child_hue_id` (or `hue_id` pointing to the final selection)
- Shows color swatch previews next to hue options

**`src/modules/admin/components/delete-paint-button.tsx`** — Client component with confirmation:
- Warns about cascading deletion of paint references

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/components/paint-form.tsx` | **New** — Paint create/edit form |
| `src/modules/admin/components/hue-selector.tsx` | **New** — Two-step hue selection with constraints |
| `src/modules/admin/components/delete-paint-button.tsx` | **New** — Delete paint with confirmation |

### Step 4: Create paint admin pages

**`src/app/admin/paints/page.tsx`** — Server component:
- Fetches paints with pagination using `getAllPaints()` or `searchPaints()`
- Supports search query param and brand filter query param
- Renders a table with columns: Swatch, Name, Brand, Product Line, Hue, Type, Actions
- "Create Paint" button linking to `/admin/paints/new`
- Pagination controls

**`src/app/admin/paints/new/page.tsx`** — Server component:
- Fetches brands list and hues list for dropdowns
- Renders the paint form in create mode

**`src/app/admin/paints/[id]/page.tsx`** — Server component:
- Fetches the paint by ID with relations
- Fetches brands list and hues list for dropdowns
- Renders the paint form in edit mode with current values
- Displays paint references below the form (read-only for now)

#### Affected Files

| File | Changes |
|------|---------|
| `src/app/admin/paints/page.tsx` | **New** — Paint list page with search and filters |
| `src/app/admin/paints/new/page.tsx` | **New** — Create paint page |
| `src/app/admin/paints/[id]/page.tsx` | **New** — Edit paint page |

### Step 5: Create brand-product line dynamic loading

The paint form needs to dynamically load product lines when the brand selection changes. Two approaches:

**Option A: Client-side fetch** — Use the client paint service to fetch product lines when brand changes. This requires a new client-accessible endpoint or using the existing service.

**Option B: Preload all** — Fetch all brands with their product lines server-side, pass as props, filter client-side.

Prefer Option B for simplicity since the total number of brands (5) and product lines (~50) is small.

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/brands/services/brand-service.ts` | **Modify** — Add `getAllBrandsWithProductLines()` if not already available |

### Risks & Considerations

- **Hue constraint complexity** — The two-step hue selection (parent → child) adds UI complexity. The constraint that a child must belong to its parent is enforced both client-side (for UX) and server-side (for data integrity).
- **Color computation accuracy** — The hex → RGB → HSL conversion must match what the seed generator uses. Extracting to a shared utility ensures consistency.
- **Product line filtering** — The product line dropdown must update dynamically when the brand changes. Since the dataset is small, preloading all options is preferable to API calls.
- **Paint list performance** — With 2,337+ paints, the list page needs pagination. The existing `getAllPaints()` method supports `limit` and `offset`.
- **Hex validation** — The hex input must validate format (`#RRGGBB`). Consider allowing entry without the `#` prefix and normalizing automatically.
- **Paint references on delete** — Deleting a paint cascades to `paint_references` (via `ON DELETE CASCADE`). The confirmation dialog should mention this.
- **`hue_id` storage decision** — When both parent and child hue are selected, `hue_id` should point to the child sub-hue (more specific). When only a parent is selected, `hue_id` points to the parent hue. This matches the current seed generator behavior.
