# Paint Detail Color Schemes — Brand Filter

**Epic:** Color Scheme Explorer
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/paint-detail-brand-schemes`
**Merge Into:** `main`

## Summary

Add a brand filter to the color schemes section on the paint detail page so painters can narrow scheme results to one or more specific brands. The `ColorWheelPaint` type already carries `brand_id` and `brand_name`; filtering is a pure client-side operation applied to the paints array before it reaches the scheme generation utilities.

## Acceptance Criteria

- [ ] The "Schemes" panel on the paint detail page shows a brand filter control in its toolbar
- [ ] By default, all brands are included (no filter applied)
- [ ] Selecting one or more brands restricts the scheme partner rows to paints from those brands only
- [ ] Selecting multiple brands shows results from all selected brands combined
- [ ] A clear/reset control returns the filter to "all brands"
- [ ] When the filtered paint pool is small (e.g., a brand with limited range), the partner rows display however many matches are available rather than erroring
- [ ] The filter state is local to the schemes panel — switching to the "Similar" tab and back resets it
- [ ] The brands list passed to the filter matches what's available in the full paint catalog (same `Brand[]` already fetched by the page)

## Implementation Plan

### Overview

The scheme generation pipeline is:

```
paints: ColorWheelPaint[]
  → (filter by selectedBrandIds)
  → filteredPaints: ColorWheelPaint[]
  → getSchemePartners(baseColor, scheme, filteredPaints)
  → SchemePartner[] (chip rows)
```

The filter is applied inside `PaintColorSchemesSection` before the paints array is handed to `SchemeOverview`. No changes to the scheme generation utilities are needed.

### 1. Thread `brands` through the toggle component

**`src/modules/paints/components/paint-sections-toggle.tsx`**

Add a `brands: Brand[]` prop. Pass it through to `<PaintColorSchemesSection brands={brands} />`. The `brands` array is already fetched by the page and available on `PaintDetail` — verify whether `PaintSectionsToggle` already receives it (used by `PaintSimilarSection`). If so, just forward it; if not, add the prop and wire it through `PaintDetail`.

### 2. Add brand filter UI and state to `PaintColorSchemesSection`

**`src/modules/palettes/components/paint-color-schemes-section.tsx`** → correct path: **`src/modules/paints/components/paint-color-schemes-section.tsx`**

Add:
- `brands: Brand[]` prop
- `const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])`
- A `filteredPaints` derived value:
  ```ts
  const filteredPaints = selectedBrandIds.length > 0
    ? paints.filter((p) => selectedBrandIds.includes(p.brand_id))
    : paints
  ```
- Pass `filteredPaints` (not `paints`) to `<SchemeOverview>`

**Brand filter UI** — place it in the section header row, to the right of the existing description text. Follow the multi-select popover pattern from `PaintSimilarSection`:

```tsx
<Popover>
  <PopoverTrigger className="btn btn-outline btn-sm">
    Brand
    {selectedBrandIds.length > 0 && (
      <span className="badge badge-sm badge-primary ml-2">
        {selectedBrandIds.length}
      </span>
    )}
  </PopoverTrigger>
  <PopoverContent className="w-56 max-h-72 overflow-auto p-2">
    <ul className="flex flex-col gap-1">
      {brands.map((brand) => {
        const id = String(brand.id)
        const checked = selectedBrandIds.includes(id)
        return (
          <li key={id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setSelectedBrandIds((prev) =>
                    checked ? prev.filter((b) => b !== id) : [...prev, id]
                  )
                }
              />
              <span>{brand.name}</span>
            </label>
          </li>
        )
      })}
    </ul>
    {selectedBrandIds.length > 0 && (
      <button
        className="btn btn-ghost btn-xs mt-2 w-full"
        onClick={() => setSelectedBrandIds([])}
      >
        Clear
      </button>
    )}
  </PopoverContent>
</Popover>
```

Import `Brand` from `@/types/paint`.

### 3. Verify `PaintDetail` passes `brands` to `PaintSectionsToggle`

**`src/modules/paints/components/paint-detail.tsx`**

Confirm `brands` is forwarded. If `PaintSectionsToggle` already receives `brands` for `PaintSimilarSection`, this may already be wired — just add the forward to `PaintColorSchemesSection`.

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/paints/components/paint-color-schemes-section.tsx` | Add `brands` prop, brand filter state, filtered paints derivation, filter UI |
| `src/modules/paints/components/paint-sections-toggle.tsx` | Add `brands` prop; pass to `PaintColorSchemesSection` (verify if already present) |
| `src/modules/paints/components/paint-detail.tsx` | Verify `brands` is forwarded to `PaintSectionsToggle`; update if not |

### Risks & Considerations

- **Small paint pools**: When a brand has few paints near the target hue, `findValueScaleNearestPaints` returns fewer than 5 chips. The existing `SchemePartnerRow` already handles this gracefully (renders whatever it receives). No defensive code needed.
- **`brand_id` type**: `ColorWheelPaint.brand_id` is a `string`; `Brand.id` is a `number`. The filter must compare `String(brand.id)` against `p.brand_id` — or normalize at the filter boundary. Check the actual types before writing the filter predicate.
- **`brands` already in scope**: The `Brand[]` array is fetched server-side by the paint detail page and already flows into `PaintDetail` for `PaintSimilarSection`. Verify the exact prop path before adding duplicate fetches.
- **Filter reset on tab switch**: Because `selectedBrandIds` lives in `PaintColorSchemesSection`, switching away from the Schemes tab and back unmounts and remounts the component, resetting the filter. This matches the acceptance criteria (intentional, not a bug).
