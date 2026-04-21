# Purchase List Toggle on Paint Cards

**Epic:** Purchase List
**Type:** Feature
**Status:** Todo
**Branch:** `feature/purchase-list-toggle`
**Merge into:** `v1/main`

## Summary

Add a shopping-cart toggle icon to paint cards so authenticated users can add or remove any paint from their purchase list directly from any browse view. Mirrors the `CollectionToggle` / `PaintCardWithToggle` pattern exactly, using a `ShoppingCart` icon instead of `Bookmark`.

## Acceptance Criteria

- [ ] Authenticated users see a shopping-cart icon on every paint card in browse views
- [ ] Clicking the icon adds the paint to the user's purchase list (icon fills); clicking again removes it (icon outline)
- [ ] State flip is instant via `useOptimistic`; reverts on error
- [ ] Unauthenticated users clicking the icon are redirected to `/sign-in?next={pathname}`
- [ ] The toggle does not trigger card navigation (click stops propagation)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

None — this feature adds UI to existing browse routes.

## Database

Depends on the `user_purchase_list` table from `00-purchase-list-schema.md`. No new migrations in this feature.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `src/modules/purchase-list/types/user-purchase-list.ts` | Raw table row type |
| Create | `src/modules/purchase-list/types/purchase-list-paint.ts` | Enriched paint entry type |
| Create | `src/modules/purchase-list/services/purchase-list-service.ts` | Core service: `getUserPurchaseListIds`, `isOnPurchaseList`, `addPaint`, `removePaint` |
| Create | `src/modules/purchase-list/services/purchase-list-service.server.ts` | Server-client wrapper |
| Create | `src/modules/purchase-list/services/purchase-list-service.client.ts` | Browser-client wrapper |
| Create | `src/modules/purchase-list/actions/add-to-purchase-list.ts` | Server action: add a paint |
| Create | `src/modules/purchase-list/actions/remove-from-purchase-list.ts` | Server action: remove a paint |
| Create | `src/modules/purchase-list/components/purchase-list-toggle.tsx` | Toggle button component |
| Create | `src/modules/purchase-list/components/paint-card-with-purchase-toggle.tsx` | Card + toggle wrapper |
| Modify | `src/app/paints/page.tsx` | Pass purchase list toggle state to paint cards |
| Modify | `src/app/paints/[id]/page.tsx` | Show purchase list toggle on paint detail page |

### Existing pattern references

| File | Why it's a reference |
|------|---------------------|
| `src/modules/collection/components/collection-toggle.tsx` | Exact pattern to mirror (swap icon, swap actions) |
| `src/modules/collection/components/paint-card-with-toggle.tsx` | Wrapper pattern for positioning toggle on card |
| `src/modules/collection/services/collection-service.ts` | Service method signatures to mirror |
| `src/modules/collection/actions/add-to-collection.ts` | Server action pattern |

## Implementation

### Step 1: Types

Create `src/modules/purchase-list/types/user-purchase-list.ts`:
```ts
/** Raw row from the user_purchase_list table. */
export type UserPurchaseList = {
  user_id: string
  paint_id: string
  added_at: string
  notes: string | null
  updated_at: string
}
```

Create `src/modules/purchase-list/types/purchase-list-paint.ts` — mirrors `collection-paint.ts`:
```ts
import type { PaintWithBrand } from '@/modules/paints/types/paint-with-brand'

/** A paint enriched with purchase list metadata. */
export type PurchaseListPaint = PaintWithBrand & {
  added_at: string
}
```

Commit: `feat(purchase-list): add purchase list types`

### Step 2: Service

Create `src/modules/purchase-list/services/purchase-list-service.ts` accepting a `SupabaseClient` parameter — mirrors `collection-service.ts`:

- `getUserPurchaseListIds(userId)` — Returns `Set<string>` of `paint_id` values for O(1) membership checks.
- `isOnPurchaseList(userId, paintId)` — Boolean.
- `addPaint(userId, paintId)` — Insert into `user_purchase_list`; handle unique-constraint violation (23505) silently (idempotent).
- `removePaint(userId, paintId)` — Delete row; idempotent.

Create server and client wrappers that call `createClient()` / `createBrowserClient()` and pass the client to the service factory:
- `purchase-list-service.server.ts`
- `purchase-list-service.client.ts`

Commit: `feat(purchase-list): add purchase list service`

### Step 3: Server actions

Create `src/modules/purchase-list/actions/add-to-purchase-list.ts`:
1. `'use server'`
2. Get user from `supabase.auth.getUser()`. Return `{ error: 'Not authenticated' }` if missing.
3. Call `service.addPaint(user.id, paintId)`.
4. `revalidatePath(revalidatePath ?? '/purchase-list')`.
5. Return `{ error?: string }`.

Create `src/modules/purchase-list/actions/remove-from-purchase-list.ts` — same shape, calls `service.removePaint`.

Commit: `feat(purchase-list): add purchase list server actions`

### Step 4: Toggle component

Create `src/modules/purchase-list/components/purchase-list-toggle.tsx` — copy `collection-toggle.tsx` and:
- Swap `Bookmark` → `ShoppingCart` from `lucide-react`
- Swap `addToCollection` → `addToPurchaseList`
- Swap `removeFromCollection` → `removeFromPurchaseList`
- Update `aria-label` text: `'Add to purchase list'` / `'Remove from purchase list'`
- Update the `isInCollection` prop to `isOnPurchaseList`

Prop signature:
```ts
{
  paintId: string
  isOnPurchaseList: boolean
  isAuthenticated: boolean
  size?: 'sm' | 'md'
  revalidatePath?: string
  className?: string
}
```

Commit: `feat(purchase-list): add PurchaseListToggle component`

### Step 5: Paint card wrapper

Create `src/modules/purchase-list/components/paint-card-with-purchase-toggle.tsx` — mirrors `paint-card-with-toggle.tsx`:
- Wraps `PaintCard` in a `relative` container
- Positions `PurchaseListToggle` at `absolute right-1 bottom-1` (bottom-right to distinguish from collection toggle which sits top-right)

Commit: `feat(purchase-list): add PaintCardWithPurchaseToggle wrapper`

### Step 6: Wire into paint browse pages

For each paint browse page that currently renders `PaintCardWithToggle` or `PaintCard`:

1. Fetch the user's purchase list IDs server-side alongside the collection IDs.
2. Pass `isOnPurchaseList` to `PaintCardWithPurchaseToggle` (or update the card grid component to accept purchase list data).

Check these pages and update accordingly:
- `src/app/paints/page.tsx`
- `src/app/paints/[id]/page.tsx` (detail page)
- `src/app/brands/[slug]/page.tsx` (if paint cards are rendered there)

Commit: `feat(purchase-list): show purchase list toggle on paint browse pages`

### Step 7: Build and verify

`npm run build && npm run lint` pass. Manual test: toggle on/off from paint browse page, verify database row created/deleted.

## Risks & Considerations

- **Two toggles on one card.** Collection (top-right bookmark) + purchase list (bottom-right cart). Keep them visually distinct. If the card is too small, consider stacking them in a single overlay column.
- **Paint detail page layout.** The detail page may have a different layout — place the toggle near the paint actions area rather than overlaying the swatch.
- **Auth redirect.** Unauthenticated toggle click must redirect; verify `usePathname` resolves correctly on all browse routes.
