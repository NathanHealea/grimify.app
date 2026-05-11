# Purchase List Dashboard

**Epic:** Purchase List
**Type:** Feature
**Status:** Todo
**Branch:** `feature/purchase-list-dashboard`
**Merge into:** `main`

## Summary

A user-facing dashboard at `/purchase-list` that mirrors the collection dashboard at `/collection`. Displays stats (total paints, top brands, by type), a debounced search input over the user's purchase list, and a paginated full-view at `/purchase-list/paints`. A nav link is added to the main navigation so authenticated users can reach their purchase list easily.

## Acceptance Criteria

- [ ] `/purchase-list` requires authentication; unauthenticated users are redirected to `/sign-in`
- [ ] Dashboard shows total paint count, top brands, and paints-by-type stats
- [ ] Dashboard shows the 10 most recently added paints when no search query is active
- [ ] Search input debounces at 250 ms and filters by paint name, hex, brand, and type
- [ ] `/purchase-list/paints` shows the full paginated purchase list with configurable page sizes
- [ ] Navbar includes a "Purchase List" link visible to authenticated users
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|-------|-------------|
| `/purchase-list` | Dashboard: stats, recent paints, search |
| `/purchase-list/paints` | Full paginated purchase list view |

## Database

Depends on the `user_purchase_list` table and the `purchase-list-service` from `00-purchase-list-schema.md` and `01-purchase-list-toggle.md`. No new migrations.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `src/modules/purchase-list/types/purchase-list-stats.ts` | Aggregated stats shape |
| Modify | `src/modules/purchase-list/services/purchase-list-service.ts` | Add `getStats`, `getPurchaseListPaints`, `searchPurchaseList`, `getPurchaseListPaintCount` |
| Create | `src/modules/purchase-list/components/purchase-list-stats.tsx` | Stats cards (mirrors `CollectionStats`) |
| Create | `src/modules/purchase-list/components/purchase-list-search.tsx` | Debounced search (mirrors `CollectionSearch`) |
| Create | `src/modules/purchase-list/components/purchase-list-paint-grid.tsx` | Client paginated grid (mirrors `CollectionPaintGrid`) |
| Create | `src/modules/purchase-list/actions/search-purchase-list.ts` | Server action for search |
| Create | `src/app/purchase-list/page.tsx` | Dashboard page (server component) |
| Create | `src/app/purchase-list/paints/page.tsx` | Full paginated view (server component) |
| Modify | `src/modules/navbar/components/navbar.tsx` | Add "Purchase List" nav link for auth'd users |

### Existing pattern references

| File | Why it's a reference |
|------|---------------------|
| `src/app/collection/page.tsx` | Dashboard page shape to mirror exactly |
| `src/app/collection/paints/page.tsx` | Paginated view shape to mirror |
| `src/modules/collection/components/collection-stats.tsx` | Stats card layout to mirror |
| `src/modules/collection/components/collection-search.tsx` | Search component shape to mirror |
| `src/modules/collection/components/collection-paint-grid.tsx` | Paginated grid client component to mirror |
| `src/modules/collection/services/collection-service.ts` | Service method signatures |

## Implementation

### Step 1: Stats type

Create `src/modules/purchase-list/types/purchase-list-stats.ts`:
```ts
/** Aggregated statistics for a user's purchase list. */
export type PurchaseListStats = {
  total: number
  byBrand: Array<{ brand: string; count: number }>
  byType: Array<{ type: string; count: number }>
}
```

Commit: `feat(purchase-list): add PurchaseListStats type`

### Step 2: Extended service methods

Extend `src/modules/purchase-list/services/purchase-list-service.ts` with:

- `getPurchaseListPaints(userId, { limit?, offset? })` — Returns `PurchaseListPaint[]`, ordered by `added_at DESC`. Select join: `user_purchase_list → paints → product_lines → brands`.
- `getPurchaseListPaintCount(userId)` — Returns `number`.
- `searchPurchaseList(userId, { query, limit? })` — Case-insensitive search on paint name, hex (prefix `#`), brand name, and paint type. Mirrors `searchCollection` in `collection-service.ts`.
- `getStats(userId)` — Fetches all paints for the user (using `getPurchaseListPaints`) and aggregates brand and type counts in JavaScript, capped at top 5 brands. Mirrors `getStats` in `collection-service.ts`.

Commit: `feat(purchase-list): add dashboard service methods`

### Step 3: Server action

Create `src/modules/purchase-list/actions/search-purchase-list.ts`:
1. `'use server'`
2. Authenticate user.
3. Call `service.searchPurchaseList(user.id, { query, limit })`.
4. Return `{ paints?, error? }`.

Commit: `feat(purchase-list): add searchPurchaseList server action`

### Step 4: Stats component

Create `src/modules/purchase-list/components/purchase-list-stats.tsx` — mirrors `collection-stats.tsx`:
- Empty state card: "Your purchase list is empty." + CTA to `/paints`.
- Three stat cards: Total paints, Top brands, By paint type.
- Same grid layout (`grid grid-cols-1 gap-4 sm:grid-cols-3`).

Commit: `feat(purchase-list): add PurchaseListStats component`

### Step 5: Search component

Create `src/modules/purchase-list/components/purchase-list-search.tsx` — mirrors `collection-search.tsx`:
- Shows 10 recently added paints when query is empty (from `initialPaints` prop).
- Debounced 250 ms search that calls `searchPurchaseList` server action.
- Links to `/purchase-list/paints` for "View all".
- Uses `PaintCardWithPurchaseToggle` for each result card.

Commit: `feat(purchase-list): add PurchaseListSearch component`

### Step 6: Paint grid component

Create `src/modules/purchase-list/components/purchase-list-paint-grid.tsx` — mirrors `collection-paint-grid.tsx`:
- Client component using browser Supabase client.
- Wraps `PaginatedPaintGrid` with purchase list data.
- Fetches `getPurchaseListPaints` via `purchaseListService.client`.
- Passes `isOnPurchaseList` state to each `PaintCardWithPurchaseToggle`.

Commit: `feat(purchase-list): add PurchaseListPaintGrid component`

### Step 7: Dashboard page

Create `src/app/purchase-list/page.tsx` — mirrors `src/app/collection/page.tsx`:

```tsx
export default async function PurchaseListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const service = createPurchaseListService(supabase)
  const [stats, recentPaints] = await Promise.all([
    service.getStats(user.id),
    service.getPurchaseListPaints(user.id, { limit: 10 }),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
      <h1 className="text-3xl font-bold">My Purchase List</h1>
      <PurchaseListStats stats={stats} />
      <PurchaseListSearch initialPaints={recentPaints} />
    </div>
  )
}
```

Commit: `feat(purchase-list): add purchase list dashboard page`

### Step 8: Full paginated view

Create `src/app/purchase-list/paints/page.tsx` — mirrors `src/app/collection/paints/page.tsx`:
- Accepts `searchParams: { page?: string; size?: string }`.
- Resolves `PAGE_SIZES = [25, 50, 100, 200]`.
- Fetches total count and paginated paints server-side.
- Renders `PurchaseListPaintGrid`.

Commit: `feat(purchase-list): add purchase list paginated view`

### Step 9: Navbar link

Find the navbar component (likely `src/modules/navbar/components/navbar.tsx` or similar). Add a "Purchase List" link that renders only for authenticated users, placed alongside the "Collection" link.

Commit: `feat(purchase-list): add purchase list link to navbar`

### Step 10: Build and verify

`npm run build && npm run lint` pass. Manual test: visit `/purchase-list` authenticated and unauthenticated, toggle paints from browse page and verify they appear in the dashboard.

## Risks & Considerations

- **Navbar location.** The navbar component path may differ; find the file by searching for "Collection" nav link in the navbar area before modifying.
- **Stats aggregation performance.** Identical concern to collection: fine for < 500 paints per user. No optimization needed now.
- **Empty purchase list.** Ensure empty state cards render and the "Browse paints" CTA is accessible.
