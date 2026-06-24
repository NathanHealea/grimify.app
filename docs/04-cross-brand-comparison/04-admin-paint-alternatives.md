# Admin Paint Alternatives Linking

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo
**Branch:** `feature/admin-paint-alternatives`
**Merge into:** `main`

## Summary

Add an "Alternatives" panel to the admin paint edit page (`/admin/paints/[id]`) that lets admins search for paints across all brands and link them as manual `alternative` paint references. Linked pairs are stored bidirectionally in the existing `paint_references` table and surface automatically in the already-wired **Alternatives** section on the public paint detail page via the existing `PaintReferences` component.

No migration is needed — the table, RLS policies, service method, and detail-page rendering are already in place.

## Acceptance Criteria

- [ ] Admin edit page displays an "Alternatives" card showing the paint's current linked alternatives (name, brand, color swatch), each with a "Remove" button.
- [ ] Admin can search for any paint by name and link it as an alternative via a search-and-add UI that mirrors the existing `AddPaintsToHue` pattern.
- [ ] Linking is **bidirectional**: adding A→B also inserts B→A so the relationship is visible from either paint's detail page.
- [ ] Removing a link is also bidirectional: deleting the A→B row also deletes B→A.
- [ ] A paint cannot be linked to itself (enforced by DB constraint; surface a clear UI error).
- [ ] A duplicate link (same pair, same relationship) is handled gracefully — no crash, a clear "already linked" message.
- [ ] After link/unlink, the admin edit page revalidates so the list reflects the new state without a full page reload.
- [ ] Linked alternatives appear in the **Alternatives** section on the public paint detail page (`/paints/[id]`) with no additional code changes (already rendered by `PaintReferences`).
- [ ] The admin panel is only visible in edit mode (not on the new paint creation form).

## Implementation Plan

### 1. Type — `paint-alternative-action-state.ts`

**File:** `src/modules/admin/types/paint-alternative-action-state.ts`

Create an action state type for both the link and unlink actions:

```ts
export type PaintAlternativeActionState = {
  success?: boolean
  error?: string
} | null
```

### 2. Action — `link-paint-alternative.ts`

**File:** `src/modules/admin/actions/link-paint-alternative.ts`

Server action that reads `paint_id` and `related_paint_id` from `FormData`, validates they differ, then inserts both directions into `paint_references` with `relationship = 'alternative'`. Use `upsert` (or check for conflict `23505`) to handle duplicates gracefully.

```ts
'use server'
// reads paint_id, related_paint_id from FormData
// inserts {paint_id, related_paint_id, relationship: 'alternative'}
// inserts {paint_id: related_paint_id, related_paint_id: paint_id, relationship: 'alternative'}
// on conflict (23505) → return { error: 'These paints are already linked.' }
// revalidatePath for both admin edit pages and both public detail pages
// returns PaintAlternativeActionState
```

Revalidate paths:
- `/admin/paints/[paint_id]`
- `/admin/paints/[related_paint_id]`
- `/paints/[paint_id]`
- `/paints/[related_paint_id]`

### 3. Action — `unlink-paint-alternative.ts`

**File:** `src/modules/admin/actions/unlink-paint-alternative.ts`

Server action that reads `paint_id` and `related_paint_id` from `FormData`, deletes both directional rows from `paint_references` where `relationship = 'alternative'`.

```ts
'use server'
// delete where (paint_id = A and related_paint_id = B) OR (paint_id = B and related_paint_id = A)
// revalidatePath same as link action
// returns PaintAlternativeActionState
```

### 4. Component — `paint-alternatives-panel.tsx`

**File:** `src/modules/admin/components/paint-alternatives-panel.tsx`

Client component. Receives:
- `paintId: string` — the paint being edited
- `initialAlternatives: PaintReferenceWithRelated[]` — already-linked alternatives (pre-filtered to `relationship === 'alternative'`)

**Sections:**

**A. Current Alternatives List**

Render `initialAlternatives` as a table with: color swatch, name, brand, and a remove form. Each row is a `<form action={unlinkFormAction}>` with hidden `paint_id` + `related_paint_id` fields and a small "Remove" submit button. Use `useActionState` on `unlinkPaintAlternative`.

After a successful unlink, optimistically remove the row from local state (or rely on server revalidation + RSC re-render — use router.refresh() pattern).

**B. Search & Add**

A debounced search input (reuse `useDebouncedQuery`) that calls `searchPaints` action (or the existing `usePaintSearch` hook). Results render as a table (color swatch, name, brand) with an "Add" button per row. Clicking "Add" submits a form with `paint_id` + `related_paint_id` to `linkPaintAlternative`.

Filter out paints already in `initialAlternatives` and the paint itself from search results client-side.

### 5. Update Admin Edit Page

**File:** `src/app/admin/paints/[id]/page.tsx`

- Import `getPaintService` (already imported) and call `getPaintReferences(id)` (already available on the service) then filter to `relationship === 'alternative'`.
- Import and render `<PaintAlternativesPanel>` inside a new `<Card>` between "Paint Details" and "Danger Zone".

```tsx
const alternativeRefs = references.filter(r => r.relationship === 'alternative')

// In JSX:
<Card>
  <CardHeader><CardTitle>Alternatives</CardTitle></CardHeader>
  <CardContent>
    <PaintAlternativesPanel paintId={paint.id} initialAlternatives={alternativeRefs} />
  </CardContent>
</Card>
```

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/types/paint-alternative-action-state.ts` | New — action state type |
| `src/modules/admin/actions/link-paint-alternative.ts` | New — link server action |
| `src/modules/admin/actions/unlink-paint-alternative.ts` | New — unlink server action |
| `src/modules/admin/components/paint-alternatives-panel.tsx` | New — admin panel component |
| `src/app/admin/paints/[id]/page.tsx` | Updated — fetch references, add panel card |

### Risks & Considerations

- **Bidirectional consistency**: The DB has no trigger enforcing both directions, so the application layer must insert/delete both rows in the same action. If one insert fails mid-flight, use a transaction or accept that an asymmetric reference is benign (still visible from one side). Supabase JS client doesn't support explicit transactions; wrap both inserts in a single RPC if strict atomicity is required — otherwise accept the rare edge case and handle at the service level by checking both on load.
- **Search excludes current paint and already-linked paints**: This is a client-side filter since the search action doesn't know the context. Ensure the exclusion list is built from `initialAlternatives` IDs plus `paintId`.
- **Public page already works**: `PaintReferences` already groups by relationship and shows "Alternatives" — no changes needed there.
- **The `getPaintReferences` call only queries one direction** (`paint_id = :id`). Bidirectional inserts mean both A→B and B→A exist, so each paint's own detail page will see its own direction. This is correct and intentional.
