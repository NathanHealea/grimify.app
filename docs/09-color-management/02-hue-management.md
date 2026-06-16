# Hue Management

**Epic:** Color Management
**Type:** Feature
**Status:** In Progress
**Branch:** `feature/hue-management`
**Merge into:** `main`

## Summary

Provide an admin interface for managing the Munsell hue hierarchy (parent hues and ISCC-NBS child sub-hues) and their associations with paints. Administrators can create, edit, and delete hues at both levels. When viewing or editing a hue, all paints associated with that hue are visible and can be disassociated individually or in bulk. Paints can also be added to a hue from the hue edit page. Deleting a hue cascades: the database sets `hue_id = NULL` on all associated paints (via `ON DELETE SET NULL`).

## Acceptance Criteria

- [x] An admin hues list page at `/admin/hues` displays all parent hues with name, hex swatch, slug, child hue count, and associated paint count
- [x] Clicking a parent hue navigates to `/admin/hues/[id]` showing the parent hue details and its child sub-hues
- [x] Parent hues can be created, edited, and deleted
- [x] Child sub-hues can be created, edited, and deleted from the parent hue detail page
- [x] The hue edit page displays all paints associated with that hue (for parent hues: paints associated with any of its child hues)
- [x] Individual paint-hue associations can be removed (sets `hue_id = NULL` on the paint)
- [x] Bulk removal of paint-hue associations is supported (select multiple paints, remove all at once)
- [ ] Paints can be added to a hue from the hue edit page (search/select paints, assign the hue)
- [x] Deleting a parent hue warns that all child hues and paint associations will be removed
- [x] Deleting a child hue warns that paint associations will be removed
- [x] Hex color swatches are displayed next to hue names throughout the admin interface
- [x] Form validation prevents empty names and duplicate slugs within scope
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

The hue admin module already exists under `src/modules/admin/` (alongside the brand/paint/product-line admin features) and the public-facing hue domain lives in `src/modules/hues/`. Most of this feature is built and shipping green; the single outstanding piece is the **"add paints to a hue"** flow (Acceptance Criterion: _Paints can be added to a hue from the hue edit page_).

### Already Implemented

The following are complete and verified against the codebase.

**Server actions** — `src/modules/admin/actions/hue-actions.ts`
- `createHue` — inserts a parent or child hue (branches on `parent_id`), auto-derives slug via `toSlug`, maps Postgres `23505` to a duplicate-slug field error, revalidates `/admin/hues`, and redirects to the new hue.
- `updateHue` — updates `name`, `slug`, `hex_code`, `sort_order`; same duplicate-slug handling; revalidates the list and detail paths.
- `deleteHue` — deletes the row and relies on the DB (`ON DELETE CASCADE` for children, `ON DELETE SET NULL` for paints); redirects to `/admin/hues`.
- `removePaintHueAssociation` — clears `hue_id` on one paint; revalidates the referring hue detail page.
- `bulkRemovePaintHueAssociations` — clears `hue_id` for a comma-separated `paint_ids` set via `.in('id', …)`; returns `removed_count`.

**Types** — `src/modules/admin/types/`
- `hue-form-state.ts` (`HueFormState`) and `paint-hue-action-state.ts` (`PaintHueActionState`) exist as specified.

**Components** — `src/modules/admin/components/`
- `hue-form.tsx` — create/edit form with hex swatch preview, slug auto-derivation, parent-only `sort_order`, hidden `parent_id`.
- `hue-paint-list.tsx` — checkbox table of associated paints with select-all, per-row remove, and bulk "Remove Selected" via `useActionState` over the two removal actions.
- `delete-hue-button.tsx` — confirmation control surfacing child-hue and paint-association impact counts.
- `hue-selector.tsx` — dependent parent/child hue dropdowns used by the **paint** form (not part of the add-to-hue flow).

**Pages** — `src/app/admin/hues/`
- `page.tsx` — parent-hue table fed by `getParentHuesWithCounts()` (swatch, name, slug, `child_count`, `paint_count`).
- `[id]/page.tsx` — detail/edit page: edit form, child-hue table (parent only) with "Add Child Hue" link, aggregated associated-paints list (parent aggregates across children via `getPaintsByHueIds`), and a danger zone.
- `new/page.tsx` — create page honoring an optional `parent_id` query param.

**Services**
- `src/modules/hues/services/hue-service.server.ts` — `getHueById`, `getChildHues`, `getParentHuesWithCounts` (counts queries already exist; the originally-planned per-hue count helpers were unnecessary).
- `src/modules/paints/services/paint-service.server.ts` — `getPaintsByHueIds` powers the associated-paints view.

### Remaining Work

#### Phase 1 — "Add paints to a hue" flow (only outstanding AC)

This phase is self-contained and ships green types/lint on its own.

**`services/` — `src/modules/paints/services/paint-service.server.ts`** (Modify)
- Add `getPaintsWithoutHue({ query, limit, offset })` returning `{ paints, count }` filtered to `hue_id IS NULL`, with an optional case-insensitive name search (`ilike`). This is the candidate pool for assignment and keeps the picker scoped to unassigned paints. Reuse the existing select shape used by `getPaintsByHueIds` so the picker and association list render identical paint rows. Add JSDoc.

**`actions/` — `src/modules/admin/actions/hue-actions.ts`** (Modify)
- Add `addPaintsToHue(prevState, formData)`: read `hue_id` and comma-separated `paint_ids`, validate non-empty selection, `UPDATE paints SET hue_id = <hue_id> WHERE id IN (…)`, return `PaintHueActionState` with `success`/`removed_count` (reuse the existing state type, or rename its `removed_count` usage to a generic `affected_count` only if it does not break `hue-paint-list.tsx`). Revalidate `/admin/hues/<hue_id>`. Add JSDoc covering side effects.
- For a child hue, the target `hue_id` is the hue itself. For a parent hue, decide the assignment target: either disallow direct assignment to a parent (assign only to child hues) or assign the parent `hue_id` directly. Match whatever the data model intends — confirm against how `paints.hue_id` references parent vs. child hues in `createPaint`/`updatePaint` (which set `hue_id` to the child when present, else the parent).

**`components/` — `src/modules/admin/components/add-paints-to-hue.tsx`** (New)
- Client component: a search input (debounced) over unassigned paints, results rendered as a checkbox list with swatch/name/brand, an "Add Selected to Hue" button, and `useActionState(addPaintsToHue, null)`.
- Reuse the existing `useAdminPaintSearch` hook pattern (`src/modules/admin/hooks/use-admin-paint-search.ts`) for debounced server-driven search; pass a search server action scoped to unassigned paints. Submit the selected IDs as a comma-separated `paint_ids` hidden field plus the `hue_id`. Follow form conventions (named imports, `import type`, `useActionState` from `react`, swatch styling via existing utility classes). Add JSDoc with `@param` for each prop.
- If the search needs a server action wrapper around `getPaintsWithoutHue`, add it as `src/modules/admin/actions/search-unassigned-paints.ts` (one action per file) returning `{ paints, count }` to satisfy the hook's `serverAction` contract.

**`app/` — `src/app/admin/hues/[id]/page.tsx`** (Modify)
- Render `<AddPaintsToHue hueId={hue.id} … />` in (or just above) the "Associated Paints" card so admins can assign paints from the edit page. Keep the page thin — pass only the data the component needs.

After this phase: flip Acceptance Criterion _"Paints can be added to a hue from the hue edit page"_ to checked, and confirm `npm run build` and `npm run lint` pass.

### Risks & Considerations

- **Parent vs. child assignment target** — `paints.hue_id` is set to the child hue when one exists, else the parent (per `createPaint`/`updatePaint`). The add-to-hue flow must mirror this so assignments are queryable the same way the rest of the app expects. Resolve this before building the action.
- **Candidate scoping** — Limiting the picker to `hue_id IS NULL` avoids silently re-homing a paint already assigned elsewhere. If reassignment from another hue is desired later, it should be an explicit, separate affordance.
- **State type reuse** — `PaintHueActionState.removed_count` is consumed by `hue-paint-list.tsx`. Reuse the type for `addPaintsToHue` as-is rather than renaming the field, to avoid touching the working removal UI.
- **Search responsiveness** — Reuse the existing debounced `useAdminPaintSearch` hook and cap result counts rather than introducing a new search mechanism.
- **Hex color input** — `hue-form.tsx` already provides manual hex entry with a swatch preview; no change needed here.
