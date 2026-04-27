# Add/Remove Paints to Personal Collection

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Completed
**Branch:** `feature/manage-collection`
**Merge into:** `v1/main`

## Summary

Allow authenticated users to add and remove paints from their personal collection, creating a digital inventory of the paints they own.

## Acceptance Criteria

- [x] Authenticated users can add a paint to their collection from any paint detail view
- [x] Authenticated users can remove a paint from their collection from any paint detail view
- [x] Authenticated users can add a paint to their collection from any paint card
- [x] Authenticated users can remove a paint from their collection from any paint card
- [x] A server action exists that can remove multiple paints from the user's collection in a single call (UI for bulk-remove is owned by `01-collection-overview.md`)
- [x] A visual indicator shows whether a paint is already in the user's collection
- [x] The add/remove action provides immediate feedback (optimistic UI)
- [x] Unauthenticated users clicking the toggle are redirected to `/sign-in?next={current path}`
- [x] Collection state is persisted in the database
- [x] `npm run build` and `npm run lint` pass with no errors

## Database

### `user_paints` Table

| Column     | Type          | Constraints                                                 |
| ---------- | ------------- | ----------------------------------------------------------- |
| `user_id`  | `uuid`        | FK to `profiles.id` on delete cascade, part of composite PK |
| `paint_id` | `uuid`        | FK to `paints.id` on delete cascade, part of composite PK   |
| `added_at` | `timestamptz` | Not null, default `now()`                                   |
| `notes`    | `text`        | Nullable (personal notes about the paint)                   |

Composite primary key on `(user_id, paint_id)`.

### Indexes

- `idx_user_paints_user_id` on `(user_id)` — scopes collection queries by owner.
- `idx_user_paints_paint_id` on `(paint_id)` — reverse lookup (used later by the "who owns this paint" community feature).

### Row Level Security

- **SELECT**: Users can read their own collection (`auth.uid() = user_id`)
- **INSERT**: Users can add to their own collection (`auth.uid() = user_id`)
- **UPDATE**: Users can update their own rows (for future `notes` edits) (`auth.uid() = user_id`)
- **DELETE**: Users can remove from their own collection (`auth.uid() = user_id`)

No public/anon access — the collection is private by default.

## Domain Module

Per `CLAUDE.md`'s Domain Module rule, all feature code lives under `src/modules/collection/`. Route pages stay thin — they fetch data and compose components.

```
src/modules/collection/
├── actions/
│   ├── add-to-collection.ts
│   ├── bulk-remove-from-collection.ts
│   └── remove-from-collection.ts
├── components/
│   ├── collection-toggle.tsx               # client — add/remove button with optimistic state
│   └── paint-card-with-toggle.tsx          # server — wraps PaintCard with a toggle overlay
├── services/
│   ├── collection-service.ts               # createCollectionService(supabase)
│   ├── collection-service.client.ts        # browser factory
│   └── collection-service.server.ts        # server factory
└── types/
    └── user-paint.ts                       # UserPaint row type
```

## Key Files

| Action | File                                                                | Description                                                                          |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Create | `supabase/migrations/YYYYMMDDHHMMSS_create_user_paints_table.sql`   | `user_paints` table + indexes + RLS                                                  |
| Create | `src/modules/collection/types/user-paint.ts`                        | `UserPaint` row type                                                                 |
| Create | `src/modules/collection/services/collection-service.ts`             | `createCollectionService` (getUserPaintIds, isInCollection, addPaint, removePaint, bulkRemovePaints) |
| Create | `src/modules/collection/services/collection-service.server.ts`      | Server factory                                                                       |
| Create | `src/modules/collection/services/collection-service.client.ts`      | Browser factory                                                                      |
| Create | `src/modules/collection/actions/add-to-collection.ts`               | `addToCollection(paintId, revalidate?)` server action                                |
| Create | `src/modules/collection/actions/remove-from-collection.ts`          | `removeFromCollection(paintId, revalidate?)` server action                           |
| Create | `src/modules/collection/actions/bulk-remove-from-collection.ts`     | `bulkRemoveFromCollection(paintIds)` server action                                   |
| Create | `src/modules/collection/components/collection-toggle.tsx`           | Client component — toggle button, `useOptimistic` state, unauthenticated redirect    |
| Create | `src/modules/collection/components/paint-card-with-toggle.tsx`      | Server wrapper that overlays `<CollectionToggle>` on `<PaintCard>`                   |
| Update | `src/modules/paints/components/paint-detail.tsx`                    | Accept `isInCollection` + `isAuthenticated` props, render the toggle beside the name |
| Update | `src/modules/paints/components/paginated-paint-grid.tsx`            | Accept optional `userPaintIds` / `isAuthenticated`; render toggle-wrapped cards      |
| Update | `src/modules/paints/components/hue-paint-grid.tsx`                  | Same                                                                                 |
| Update | `src/modules/paints/components/hue-group-paint-grid.tsx`            | Same                                                                                 |
| Update | `src/modules/brands/components/brand-paint-list.tsx`                | Same                                                                                 |
| Update | `src/app/paints/[id]/page.tsx`                                      | Resolve user + membership, pass to `<PaintDetail>`                                   |
| Update | `src/app/paints/page.tsx`                                           | Resolve user + `getUserPaintIds`, pass to the paint grid                             |
| Update | `src/app/hues/[id]/page.tsx` (and any parent hue page)              | Same                                                                                 |
| Update | `src/app/brands/[id]/page.tsx`                                      | Same                                                                                 |

## Dependencies

- **Blocks** `02-collection-dashboard.md` — dashboard reads `user_paints` and uses `getUserPaintIds` / stats off the same service.
- **Blocks** `01-collection-overview.md` — overview grid consumes `bulkRemoveFromCollection`.

## Implementation Plan

### 1. Database migration

Create `supabase/migrations/YYYYMMDDHHMMSS_create_user_paints_table.sql`:

- `CREATE TABLE public.user_paints (user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, paint_id uuid NOT NULL REFERENCES paints(id) ON DELETE CASCADE, added_at timestamptz NOT NULL DEFAULT now(), notes text, PRIMARY KEY (user_id, paint_id));`
- `CREATE INDEX idx_user_paints_user_id ON public.user_paints (user_id);`
- `CREATE INDEX idx_user_paints_paint_id ON public.user_paints (paint_id);`
- `ALTER TABLE public.user_paints ENABLE ROW LEVEL SECURITY;`
- Four policies (SELECT/INSERT/UPDATE/DELETE) all of the form `auth.uid() = user_id`, scoped to `authenticated`.
- Apply locally via the project's existing Supabase CLI flow.

### 2. Types — `src/modules/collection/types/user-paint.ts`

Export `UserPaint`:

```ts
export type UserPaint = {
  user_id: string
  paint_id: string
  added_at: string
  notes: string | null
}
```

JSDoc documents the shape and notes that `notes` is nullable.

### 3. Collection service — `src/modules/collection/services/collection-service.ts`

`createCollectionService(supabase: SupabaseClient)` returning:

- `getUserPaintIds(userId: string): Promise<Set<string>>` — `select('paint_id').eq('user_id', userId)`. Returns a `Set<string>` so render code can do O(1) `has()` lookups.
- `isInCollection(userId: string, paintId: string): Promise<boolean>` — existence check via `.maybeSingle()`.
- `addPaint(userId: string, paintId: string): Promise<{ error?: string }>` — INSERT; treat unique-constraint violations (code `23505`) as idempotent success.
- `removePaint(userId: string, paintId: string): Promise<{ error?: string }>` — DELETE by composite key; idempotent (no row → no error).
- `bulkRemovePaints(userId: string, paintIds: string[]): Promise<{ error?: string; removedCount: number }>` — DELETE `.in('paint_id', paintIds)`; returns the count.

All writes rely on RLS to enforce ownership, but actions pass `userId` explicitly so the intent is obvious when reading the code.

Also create:

- `collection-service.server.ts` — `getCollectionService()` backed by `createClient` from `@/lib/supabase/server`.
- `collection-service.client.ts` — `getCollectionService()` backed by `createClient` from `@/lib/supabase/client`.

Export the type: `export type CollectionService = ReturnType<typeof createCollectionService>`.

### 4. Server actions

All three follow the same shape:

1. `createClient()` (server).
2. Resolve the current user; return `{ error: 'You must be signed in.' }` if absent.
3. Delegate to the service.
4. Optionally `revalidatePath(revalidate, 'page')` when the caller passes a pathname — this keeps revalidation narrow; `useOptimistic` already handles the immediate flip.

Files:

- `actions/add-to-collection.ts` — `addToCollection(paintId: string, revalidate?: string)`.
- `actions/remove-from-collection.ts` — `removeFromCollection(paintId: string, revalidate?: string)`.
- `actions/bulk-remove-from-collection.ts` — `bulkRemoveFromCollection(paintIds: string[])`; hard-cap array length at 500 and return `{ removedCount, error? }`.

Actions return `{ error?: string }` instead of throwing — the client reverts its optimistic state on error.

### 5. `CollectionToggle` client component — `src/modules/collection/components/collection-toggle.tsx`

Props:

- `paintId: string`
- `isInCollection: boolean` — server-rendered initial state
- `isAuthenticated: boolean`
- `size?: 'sm' | 'md'`
- `revalidatePath?: string` — passed through to the server action

Behavior:

- `useOptimistic` over `isInCollection` for instant flip on click.
- `useTransition` drives the action call; on `{ error }`, revert the optimistic value and surface the error in an `aria-live="polite"` span.
- When `isAuthenticated === false`, clicking pushes `/sign-in?next={pathname}` (via `useRouter`) — no action call.
- Icon: filled bookmark (or heart) when in collection, outlined when not. `aria-pressed={isInCollection}` exposes state to assistive tech.
- The `<button>`'s click handler calls `e.stopPropagation()` and `e.preventDefault()` so overlaying it on top of a `<Link>` card does not trigger navigation.
- No internal data fetching — the server owns initial state.

### 6. `PaintCardWithToggle` — `src/modules/collection/components/paint-card-with-toggle.tsx`

Server component. Renders the existing `<PaintCard>` inside a `relative` wrapper and overlays `<CollectionToggle>` absolutely top-right. Accepts `PaintCard`'s props plus `isInCollection`, `isAuthenticated`, `revalidatePath`. The full card stays clickable; the toggle intercepts its own clicks.

### 7. Integrate into `PaintDetail`

Update `src/modules/paints/components/paint-detail.tsx` to accept:

- `isInCollection: boolean`
- `isAuthenticated: boolean`

Render `<CollectionToggle size="md" revalidatePath="/paints/{id}" .../>` adjacent to the paint's `<h1>`.

Update `src/app/paints/[id]/page.tsx`:

1. After `getPaintById`, call `supabase.auth.getUser()`.
2. If a user exists, call `collectionService.isInCollection(user.id, paint.id)`.
3. Pass both into `<PaintDetail>`.

### 8. Integrate into paint listing grids

For each grid that renders `PaintCard` (`paginated-paint-grid.tsx`, `hue-paint-grid.tsx`, `hue-group-paint-grid.tsx`, `brand-paint-list.tsx`):

- Add optional `userPaintIds?: Set<string>` and `isAuthenticated?: boolean` props.
- When `isAuthenticated === true`, render `<PaintCardWithToggle isInCollection={userPaintIds?.has(paint.id) ?? false} revalidatePath={...} />` instead of `<PaintCard>`.

Update the pages that feed those grids (`/paints`, `/hues/[id]` and its parent listing if any, `/brands/[id]`) to:

1. `supabase.auth.getUser()`.
2. When a user exists, `collectionService.getUserPaintIds(user.id)`.
3. Thread `userPaintIds` + `isAuthenticated` into the grid.

Verify via grep that every `PaintCard` call site has been covered — missing one will silently render a non-toggle card for authed users.

### 9. Verification

- Apply the migration against the local Supabase dev DB and confirm RLS policies with a signed-in user.
- Manually exercise: add/remove from the paint detail page; add/remove from the grid overlay on `/paints`, `/hues/[id]`, and `/brands/[id]`; refresh and confirm state persists; sign out and confirm the toggle redirects to `/sign-in?next=...`.
- Run `npm run build` and `npm run lint`.

## Risks & Considerations

- **Schema typo in the original doc.** The previous revision spec'd `paint_id int`, but `paints.id` is `uuid`. Corrected above; any service or RLS policy referencing `paint_id` must treat it as a UUID string.
- **Paint card is a `<Link>`.** An interactive overlay inside a link requires `stopPropagation` + `preventDefault` in the toggle's handler. The tested pattern is a positioned `<button>` as a sibling of (not inside) the `<Link>`.
- **Grid prop thread-through.** Four grid components plus their feeder pages must all pass `userPaintIds` / `isAuthenticated`. A missed call site silently regresses the feature. Grep for `PaintCard` during implementation.
- **Idempotency.** Adding a paint already present and removing one already absent must both succeed silently — otherwise a second tab can put the optimistic UI and the server out of sync.
- **`revalidatePath` scope.** Revalidating `/paints` on every add/remove is expensive; prefer revalidating just the current page via the `revalidate` arg. `useOptimistic` covers the immediate flip regardless.
- **Coordination with sibling docs.** `01-collection-overview.md` will consume `bulkRemoveFromCollection`; `02-collection-dashboard.md` will consume `getUserPaintIds` and collection stats. Keep the service API stable once shipped.

## Notes

- The `notes` column is shipped as a nullable column only — no UI affordance in this feature. A future enhancement adds note editing.
- Collection data is private by default (RLS-scoped). The Community & Social epic adds opt-in public sharing.
- Write operations require authentication — the toggle component handles the unauthenticated case by redirecting to `/sign-in?next=...`.
