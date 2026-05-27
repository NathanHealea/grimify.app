# Show Paint Type in Palette Paint Search Results

**Epic:** Color Palettes
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/palette-paint-search-show-type`
**Merge into:** `main`

## Summary

When adding paints to a palette via the search picker on `/user/palettes/[id]/edit`, the dropdown rows currently surface only the color swatch, the paint name, an optional "In collection" pill, and the brand name. Users have asked for the **paint type** (e.g., Layer, Base, Contrast, Wash, Shade, Metallic) to also appear on each row so they can disambiguate paints that share a name across types (e.g., Citadel's classic "Mephiston Red" Base vs. Layer, or Vallejo's many "Black" variants across Game Color, Model Color, Game Air, etc.).

The change is **UI-only**. The paint type field is already projected onto the `ColorWheelPaint` records that the picker searches — no schema, service, or query work is required.

## Background

### Why it matters

Across most brands, paint **type** is the second most useful disambiguator after brand. Two paints with identical or near-identical names frequently differ only in type:

- *Vallejo Game Color* "Black" vs. *Vallejo Game Air* "Black" (same brand, different product line — but the product line maps roughly to the painted-type role)
- *Citadel* "Mephiston Red" Base vs. *Citadel* "Mephiston Red" Layer
- Numerous metallics that share base color names with non-metallic counterparts

Today the picker shows brand and an "In collection" pill, which means painters either pick the wrong row or have to open the paint detail page in another tab to verify. Surfacing the type next to the brand makes the row self-disambiguating.

### Why not bundle the other paint search UIs?

`PaintCombobox` (the underlying primitive — see _Affected Files_) is shared between the palette picker and the cross-brand comparison picker. Other paint search/picker surfaces exist elsewhere in the app (navbar quick search, the proposed bulk-import flow in [`06-collection-tracking/05-bulk-paint-import.md`](../06-collection-tracking/05-bulk-paint-import.md), the in-flight palette-aware recipe step picker in [`12-painting-recipes/06-migrate-recipe-palette-combobox.md`](../12-painting-recipes/06-migrate-recipe-palette-combobox.md)). The same enhancement is broadly useful, but bundling them would expand this enhancement well past the user's request and pull in components owned by different epics.

This doc scopes the change to **just `PaintCombobox` and the palette flow that consumes it**. Because `PaintCombobox` is the shared primitive, the comparison picker (Cross-Brand Comparison epic) inherits the improvement for free — that's noted in _Knock-on Effects_, not bundled as separate work. Other pickers that use their own search UI (navbar, bulk import) are listed as follow-ups.

## Goals

- Display the paint type (e.g., `Layer`, `Base`, `Wash`) on each search-result row in the palette paint picker.
- Match the visual treatment of existing in-row metadata (brand text + soft badge for "In collection") — the type should look like a peer to those elements, not a louder primary affordance.
- Degrade gracefully when `paint_type` is `null`: the row renders as it does today (no empty placeholder).
- Stay within `ColorWheelPaint`'s existing fields — no service, query, or schema changes.

## Non-Goals

- Adding paint type as a **filter** on the picker. That's the explicit subject of [`02-paint-data-search/10-paint-explorer-filters.md`](../02-paint-data-search/10-paint-explorer-filters.md) for the main paint explorer, and a separate decision for the picker.
- Adding type to the navbar quick-search dropdown, the recipe palette combobox, or the proposed bulk-import paint search. See _Follow-Ups_.
- Changing the row layout, dropdown size, or `maxResults` cap.
- Adding "metallic" or "discontinued" badges to the row (a separate visual-density conversation).

## Where the Code Lives

### Picker entry point — palette edit page

- [`src/modules/palettes/components/palette-builder.tsx`](../../src/modules/palettes/components/palette-builder.tsx) lines 64-80 — renders `<PalettePaintPicker catalog={catalog} ... />` and passes the `ColorWheelPaint[]` catalog down.
- [`src/modules/palettes/components/palette-paint-picker.tsx`](../../src/modules/palettes/components/palette-paint-picker.tsx) — wraps `PaintCombobox` and handles the "Also save to my collection" affordance. **No changes required here**: the picker already passes the full `ColorWheelPaint` records (which include `paint_type`) into the combobox.

### The component to change

- [`src/modules/paints/components/paint-combobox.tsx`](../../src/modules/paints/components/paint-combobox.tsx) lines 96-117 — the result-row markup. Today it renders:

  ```tsx
  <span className="truncate">{paint.name}</span>
  <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
    {ownedIds?.has(paint.id) && (
      <span className="badge badge-soft badge-xs">In collection</span>
    )}
    {paint.brand_name}
  </span>
  ```

  This is the single file the enhancement edits.

### Data source — paint_type is already on the projection

- [`src/modules/color-wheel/types/color-wheel-paint.ts`](../../src/modules/color-wheel/types/color-wheel-paint.ts) line 26 — `paint_type: string | null` is part of `ColorWheelPaint`.
- [`src/modules/paints/services/paint-service.ts`](../../src/modules/paints/services/paint-service.ts) lines 518-543 — the catalog query already selects `paint_type` from the `paints` table and maps it onto each `ColorWheelPaint`.

The picker therefore has everything it needs in memory. **No service, no query, no schema work.**

### The canonical field — paint type vs. paint line

This is worth pinning down because the two are easy to conflate:

| Concept | Field | Examples | Cardinality |
|---|---|---|---|
| **Paint type** (what this doc shows) | `paints.paint_type` (text, nullable) | `base`, `layer`, `shade`, `contrast`, `dry`, `technical`, `wash`, `glaze`, ... | ~10-25 |
| **Product line** (NOT what this doc shows) | `paints.product_line_id` → `product_lines.name` | "Citadel Air", "Warpaints Fanatic", "Game Color", "Model Color" | ~30-50 |
| **Brand** (already shown) | `product_lines.brands.name` | "Citadel", "Vallejo", "The Army Painter" | ~10-15 |

The combobox already shows `paint.brand_name`. This doc adds `paint.paint_type`. Product line is **not** added — it would crowd the row and is largely redundant with type+brand for the disambiguation goal. The picker also already filters by brand-line membership upstream through the catalog projection, so the line is not load-bearing in the row.

The codebase consistently uses `paint_type` as the field name. See [`paint-detail.tsx`](../../src/modules/paints/components/paint-detail.tsx) line 107, [`paint-card.tsx`](../../src/modules/paints/components/paint-card.tsx) line 61, [`paint-comparison-card.tsx`](../../src/modules/paints/components/paint-comparison-card.tsx) line 66, and many more. This enhancement uses the same naming.

## UX & Visual Design

### Where the type renders in the row

Three placements were considered:

| Option | Sketch | Pros | Cons |
|---|---|---|---|
| **A. Inline with brand text** | `[swatch] Name [In collection] Citadel · Layer` | Cheapest; reuses the existing brand text node; no new visual primitive. | Long brand+type combinations can crowd the right side on small screens. |
| **B. New `badge-soft badge-xs` next to "In collection"** | `[swatch] Name [Layer] [In collection] Citadel` | Visual peer of the existing pill; consistent with `PaintDetail`'s primary-tinted type badge. | Two badges side-by-side; can look noisy when both are present. |
| **C. Subtitle row beneath the name** | `[swatch] Name\n        Citadel · Layer    [In collection]` | Most room; never crowds. | Doubles the row height; changes the picker's vertical rhythm and `maxResults` perceived density. |

**Recommendation: Option A — inline text next to brand.** Rationale:

1. **Style precedent.** [`PaintCard`](../../src/modules/paints/components/paint-card.tsx) line 61 already uses this exact format for its metadata line:

   ```tsx
   {brand}{brand && paintType ? ': ' : ''}{paintType?.replace(/\b\w/g, (c) => c.toUpperCase())}
   ```

   The combobox row is conceptually a denser sibling of `PaintCard` — using the same convention keeps the visual language coherent across the app.

2. **Density.** The picker dropdown is tight: swatch + name + (optional) "In collection" pill + brand, all on a single row. A second badge (Option B) competes for attention with the pill, and a subtitle row (Option C) halves the visible results.

3. **The pill is reserved for state, not metadata.** The "In collection" pill encodes a viewer-specific relationship to the paint ("you own this"). Brand and type are intrinsic paint metadata. Mixing them as visual peers blurs the row's information hierarchy.

4. **Truncation behavior.** The right-side metadata span already has `flex shrink-0` and the name span uses `truncate` — inline text composes cleanly with both. We use the same connector character as `PaintDetail` line 103 (`{' — '}`, an em-dash) when both fields are present, and fall back to just the brand when `paint_type` is `null`. (`PaintCard` uses `: ` — see _Open Question_ on which connector to pick.)

The recommended render:

```tsx
<span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
  {ownedIds?.has(paint.id) && (
    <span className="badge badge-soft badge-xs">In collection</span>
  )}
  <span>
    {paint.brand_name}
    {paint.paint_type ? ` — ${formatType(paint.paint_type)}` : ''}
  </span>
</span>
```

Where `formatType` title-cases the value (matching `PaintCard` line 61): `'layer'` → `'Layer'`, `'dry'` → `'Dry'`.

### Edge cases

- **`paint_type === null`**: render the brand alone, exactly as today. Do not show a dash, an "Unknown" string, or any placeholder. The picker already exercises this path for any paint with no type set in the database.
- **Long type values (`'technical'`, `'contrast'`)**: combined with the brand and a non-trivial name, the right-hand metadata can exceed the available width on narrow screens. The existing layout uses `flex shrink-0` on the metadata wrapper, which means the **name** truncates first (good — the swatch always disambiguates), and the metadata stays intact. Confirm during QA on a phone-width screen; if a brand+type combo overflows, add `truncate` and a `max-w-[8rem]` cap on the brand+type span. This is a defensive measure; in practice no current brand-name + paint-type combination exceeds ~24 characters.
- **Title-casing**: the database stores `paint_type` lowercase by convention. `formatType` uppercases the first letter of each word so users see `Layer`, not `layer`. Multi-word types like `'dry brush'` (if any exist) become `'Dry Brush'`.
- **Discontinued paints in the dropdown**: `getColorWheelPaints()` excludes discontinued paints by default, so they should not appear in the picker. If a future change changes that, the brand+type line is unaffected; a separate decision determines whether to surface a "Discontinued" indicator in the row.

### Open Question — connector character

`PaintCard` uses `': '` (`Citadel: Layer`). `PaintDetail` uses ` — ` (`Citadel — Citadel Layer`, though that's brand→product-line). Pick one for the picker:

- `': '` matches `PaintCard`, our closest peer.
- `' — '` matches `PaintDetail` and reads slightly more "designed."

**Recommended:** `' — '` (em-dash with spaces) for the picker. It's the more "metadata-list" character and pairs better with the badge that may sit to its left. If a future cross-domain UI audit wants to unify on one connector, that's a cosmetic refactor.

## Acceptance Criteria

- [ ] On `/user/palettes/[id]/edit`, typing into the "Search paints to add to this palette…" input produces a dropdown where each row displays the paint type to the right of the name, alongside the brand.
- [ ] When `paint_type` is non-null, the row reads `Brand — Type` (e.g., `Citadel — Layer`), with the type title-cased.
- [ ] When `paint_type` is `null`, the row reads only the brand (e.g., `Citadel`), with no dash, "Unknown", or empty span.
- [ ] The "In collection" badge continues to render to the left of the brand+type text when `ownedIds.has(paint.id)`.
- [ ] The row layout (height, swatch, name truncation) is visually unchanged from today — the only difference is the added type text.
- [ ] On a phone-width viewport (≤375px), long brand+type combinations do not push the swatch or name out of view; the name truncates first as it does today.
- [ ] The cross-brand comparison picker (`PaintComparisonPicker` → `PaintCombobox`) automatically inherits the same display (covered by _Knock-on Effects_ below — confirm during QA).
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Affected Files

| Action | File | Change |
|---|---|---|
| Modify | `src/modules/paints/components/paint-combobox.tsx` | Update the result-row span (lines 109-114) to render `paint.paint_type` after `paint.brand_name`, separated by an em-dash, with title-case formatting. Add a small `formatType` helper (inline arrow function or module-private const) that handles the casing — match the pattern in `PaintCard` line 61. JSDoc on the component's prop section: clarify that the row now also surfaces `paint.paint_type` when non-null. |

That's the entire surface area of the change. No new files, no new types, no new actions, no new services.

## Knock-on Effects (not bundled, but worth knowing)

- **Cross-brand comparison picker** (`src/modules/paints/components/paint-comparison-picker.tsx`) wraps the same `PaintCombobox`. Because the change is in the shared primitive, the comparison picker's dropdown also gains the type display automatically. This is desirable — the same disambiguation problem exists there — and should be QA-checked.

## Follow-Ups (do NOT bundle)

These were considered and explicitly left out. File separately if/when prioritized.

- **Navbar paint search** ([`02-paint-data-search/09-navbar-paint-search.md`](../02-paint-data-search/09-navbar-paint-search.md), `src/modules/paints/components/navbar-search-bar.tsx`) — uses its own search UI; adding type to navbar results is a separate UX decision because the navbar is space-constrained.
- **Bulk paint import picker** ([`06-collection-tracking/05-bulk-paint-import.md`](../06-collection-tracking/05-bulk-paint-import.md)) — currently proposed, not yet implemented. When that ships, its search-result row should also show type.
- **Recipe step paint picker** ([`12-painting-recipes/06-migrate-recipe-palette-combobox.md`](../12-painting-recipes/06-migrate-recipe-palette-combobox.md)) — a Radix-Select-based picker; once migrated, evaluate whether its options should also surface type.
- **Cross-domain UI audit** ([`13-application-improvements/02-cross-domain-ui-audit.md`](../13-application-improvements/02-cross-domain-ui-audit.md)) — could fold all paint pickers into one shared row component with consistent metadata rules.

## Implementation Plan

### Step 1 — Edit `paint-combobox.tsx`

Open [`src/modules/paints/components/paint-combobox.tsx`](../../src/modules/paints/components/paint-combobox.tsx) and update the result-row markup (lines 96-117). Two specific changes:

1. Add a small title-case helper at the top of the file (or inline as an arrow function) — pattern lifted from `PaintCard` line 61:

   ```tsx
   const formatType = (type: string) => type.replace(/\b\w/g, (c) => c.toUpperCase())
   ```

2. Replace the right-side metadata span (current lines 109-114) with a version that appends the type when non-null:

   ```tsx
   <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
     {ownedIds?.has(paint.id) && (
       <span className="badge badge-soft badge-xs">In collection</span>
     )}
     <span>
       {paint.brand_name}
       {paint.paint_type ? ` — ${formatType(paint.paint_type)}` : ''}
     </span>
   </span>
   ```

3. Update the component's JSDoc prop block to note that the row now also surfaces `paint.paint_type` (in addition to brand and the optional "In collection" badge).

No other lines in the file change. No imports are added or removed.

### Step 2 — Manual QA checklist

- `/user/palettes/[id]/edit`, type a query that matches a paint with a known type (e.g., "mephiston") → dropdown row reads `Mephiston Red Citadel — Layer` (or similar). Owned status pill still renders when applicable.
- Type a query that matches a paint with `paint_type IS NULL` in the DB → dropdown row shows only the brand, no trailing dash.
- Resize to a phone-width viewport (≤375px) → long brand+type combos do not push the swatch or "In collection" pill out of view; the name truncates first.
- Open the cross-brand comparison page (`/paints/compare`) → the comparison picker dropdown also shows the type (inherited from the shared `PaintCombobox`).
- Pick a paint from the palette picker → the existing "Added 'X' to 'Y'" toast fires; the paint appears in the list; the picker resets. (No regression of the existing select handler.)
- `npm run build` + `npm run lint`.

### Step 3 — Cross-reference

Append a one-line note to [`02-paint-data-search/10-paint-explorer-filters.md`](../02-paint-data-search/10-paint-explorer-filters.md) (the explorer filters plan that introduces `paint_type` as a **filter** dimension), pointing to this doc, so future readers see the related "surface type as info" and "filter by type" decisions in one chain. Specifically: under that doc's _Cross-references_ / _Notes_ section (if present, otherwise a new one-line note), add:

> Paint type is also surfaced inline on the palette paint picker — see [`17-palette-paint-search-show-type.md`](../11-color-palettes/17-palette-paint-search-show-type.md).

If the explorer-filters doc has no obvious place for this, skip step 3. It's a nice-to-have, not a blocker.

## Risks & Considerations

- **Shared component, no toggle.** `PaintCombobox` does not currently expose a "show type" / "hide type" prop, and this enhancement does not add one. Every consumer of `PaintCombobox` (today: palette picker, comparison picker) gets the type column. That's intentional — the field is broadly useful and the row already has space. If a future consumer truly needs to suppress the type, add an opt-out prop then; don't pre-emptively add complexity.
- **Title-casing fidelity.** The `formatType` helper assumes whitespace-separated word boundaries. Some database values may include hyphens or punctuation we haven't seen. Spot-check the distinct `paint_type` values during QA — run `SELECT DISTINCT paint_type FROM paints ORDER BY paint_type` against the local Supabase DB if anything looks odd. The same helper is in production via `PaintCard` line 61, so any regression here is also a regression there.
- **Connector character churn.** `PaintCard` (`: `) and `PaintDetail` (` — `) disagree. This doc picks ` — `. If the cross-domain UI audit ([`13-application-improvements/02-cross-domain-ui-audit.md`](../13-application-improvements/02-cross-domain-ui-audit.md)) standardizes on `: `, revisit. Trivial change.
- **No new data fetched.** The catalog used by `PalettePaintPicker` already includes `paint_type` per the `ColorWheelPaint` projection and the `getColorWheelPaints()` query. No risk of N+1 fetches, no risk of stale data.
- **No new test surface introduced.** The project has no test framework configured (per `CLAUDE.md` → _Testing_), so the acceptance criteria are exercised via manual QA only. If a testing framework is added later, the natural unit to cover is `PaintCombobox`'s render output for `paint_type` non-null vs. null and the `formatType` helper.

## Notes

- This is an information-density enhancement to an existing flow — the kind of polish that compounds for users who use the picker many times per session. It costs roughly a single-file diff and zero data work because previous foundation features (the `ColorWheelPaint` projection, `getColorWheelPaints()` selecting `paint_type`) already paved the way.
- If the user follow-up is "and also surface the product line," that's a separate decision because product line is more verbose and overlaps semantically with type for some brands. Don't pre-empt it here.
