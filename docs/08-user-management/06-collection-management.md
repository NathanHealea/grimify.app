# Collection Management

**Epic:** User Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/admin-user-collection-crud`
**Merge into:** `v1/main`

## Summary

Admin interface for performing CRUD operations on a specific user's paint collection. Admins navigate to a user's collection from the existing user detail page (`/admin/users/[id]`) and land on `/admin/users/[id]/collection`, which shows a searchable paint-card grid. Each card has an ellipsis dropdown with a "Remove from collection" action. Admins can also add paints via an inline search-and-pick form. The search bar uses the same debounced server-action pattern as the user-facing collection search.

## Acceptance Criteria

- [ ] A "Collection" navigation link is visible on the user detail page (`/admin/users/[id]`) and links to `/admin/users/[id]/collection`
- [ ] `/admin/users/[id]/collection` renders the target user's paints in a responsive grid (matching the layout of `/collection/paints`)
- [ ] Page header shows the user's display name, avatar, and total paint count
- [ ] A debounced search bar (250ms, no URL sync) filters the displayed paint cards by calling a server action, mirroring the behavior of `CollectionSearch` in `src/modules/collection/components/collection-search.tsx`
- [ ] When the search is empty the full collection grid is shown; when a query is active, only matching paints are shown
- [ ] Each paint card has an ellipsis (⋯) dropdown menu with a "Remove from collection" option
- [ ] "Remove from collection" removes the paint from the user's collection; the grid updates on revalidation
- [ ] Admins can add a paint to the user's collection via a searchable paint-picker form on the page
- [ ] Admin RLS policies on `user_paints` allow admins to read and write any user's rows while non-admin users continue to be scoped to their own rows
- [ ] Admins cannot mutate their own collection through the admin UI — the add and remove controls are hidden and the server actions reject self-modification
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|-------|-------------|
| `/admin/users/[id]/collection` | User's collection: search, paint grid, add/remove controls |

## Database

### Dependency

Requires the `user_paints` table from [`00-manage-collection.md`](../06-collection-tracking/00-manage-collection.md). Verify the table exists before starting.

### Migration — admin RLS policies

Create `supabase/migrations/XXXXXX_admin_user_paints_policies.sql`:

```sql
CREATE POLICY "Admins can read all user_paints"
  ON public.user_paints FOR SELECT TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can insert into any user_paints"
  ON public.user_paints FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete any user_paints"
  ON public.user_paints FOR DELETE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));
```

Policies are additive — existing `auth.uid() = user_id` policies remain in place.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/migrations/XXXXXX_admin_user_paints_policies.sql` | Admin RLS policies on `user_paints` |
| Create | `src/modules/admin/services/collection-service.ts` | `getUserCollection`, `searchUserCollection`, `countUserPaints` |
| Create | `src/modules/admin/actions/add-paint-to-collection.ts` | Server action: admin adds a paint to a user's collection |
| Create | `src/modules/admin/actions/remove-paint-from-collection.ts` | Server action: admin removes a single paint |
| Create | `src/modules/admin/actions/search-user-collection.ts` | Server action: admin searches a user's collection |
| Create | `src/modules/admin/components/admin-user-collection-search.tsx` | Debounced search + results grid (mirrors `CollectionSearch`) |
| Create | `src/modules/admin/components/admin-collection-paint-card.tsx` | Paint card with ellipsis dropdown for remove action |
| Create | `src/modules/admin/components/admin-add-paint-form.tsx` | Inline paint-picker form to add a paint to the collection |
| Create | `src/app/admin/users/[id]/collection/page.tsx` | Collection page server component |
| Modify | `src/app/admin/users/[id]/page.tsx` | Add "Collection" link to the user detail navigation |

### Existing files (pattern references — no changes)

| File | Why it's a reference |
|------|---------------------|
| `src/modules/collection/components/collection-search.tsx` | Debounced search + grid pattern to mirror |
| `src/modules/collection/actions/search-collection.ts` | Server action shape to mirror |
| `src/modules/paints/components/paint-card.tsx` | Paint card to wrap with ellipsis dropdown |
| `src/app/admin/users/[id]/page.tsx` | User detail page to add Collection link to |
| `src/modules/admin/actions/delete-role.ts` | Server action pattern: auth check → self-protection → mutate → revalidate |

## Implementation Plan

### Step 1: Migration — admin RLS policies

Create `supabase/migrations/XXXXXX_admin_user_paints_policies.sql` with the three policies above. Apply with `npx supabase db push` (local) and regenerate types with `npm run db:types`.

Commit: `feat(admin): add admin RLS policies for user_paints`

### Step 2: Admin collection service

Create `src/modules/admin/services/collection-service.ts`:

```ts
// getUserCollection(userId): fetches the user's profile + all paints in their collection
//   query: user_paints → paints → product_lines → brands
//   returns { profile: { display_name, email, avatar_url }, paints: CollectionPaint[], count: number }
//
// searchUserCollection(userId, query): same join but filtered by name/brand/type/hex
//   mirrors the JS-filter approach in CollectionService.searchCollection
//   returns CollectionPaint[]
//
// countUserPaints(userId): returns the count of rows for a user (used after mutations)
```

Use `createClient()` (server, anon key) — admin RLS policies grant access. No service-role client.

Commit: `feat(admin): add admin collection service`

### Step 3: Server actions

Create three server actions in `src/modules/admin/actions/`. Each follows the pattern: `'use server'`, get current user, reject if unauthenticated, reject if `userId === currentUser.id`, perform mutation, revalidate, return `{ error?: string }`.

**`search-user-collection.ts`** — `searchUserCollection(userId: string, query: string)`
- Calls `adminCollectionService.searchUserCollection(userId, query)`
- Returns `{ paints: CollectionPaint[] } | { error: string }`
- No revalidation needed (read-only)

**`add-paint-to-collection.ts`** — `addPaintToCollection(userId: string, paintId: string)`
- Inserts into `user_paints`. Handle unique-violation gracefully.
- `revalidatePath('/admin/users/${userId}/collection')`

**`remove-paint-from-collection.ts`** — `removePaintFromCollection(userId: string, paintId: string)`
- Deletes from `user_paints` by `user_id + paint_id`.
- `revalidatePath('/admin/users/${userId}/collection')`

Commit: `feat(admin): add admin collection server actions`

### Step 4: Components

**`admin-collection-paint-card.tsx`** — wraps `PaintCard` in a `relative` container:
- Renders `PaintCard` with the existing props (`id`, `name`, `hex`, `brand`, `paintType`)
- Absolutely positions an ellipsis (`⋯`) button at the top-right (matching `paint-card-with-toggle.tsx` positioning pattern)
- Clicking the ellipsis opens a dropdown with a single item: "Remove from collection"
- "Remove from collection" calls `removePaintFromCollection(userId, paintId)` via `useTransition`
- Disabled while transition is pending
- Use shadcn `DropdownMenu` for the ellipsis menu

**`admin-user-collection-search.tsx`** — mirrors `CollectionSearch`:
- Accepts `userId: string` and `initialPaints: CollectionPaint[]`
- `SearchInput` captures query; 250ms debounce
- On query change calls `searchUserCollection(userId, query)` server action
- Shows `initialPaints` grid when query is empty (label: "All paints")
- Shows search results grid when query is active
- Renders each paint via `AdminCollectionPaintCard`

**`admin-add-paint-form.tsx`** — inline paint picker:
- Text input that calls a paint search (reuse `searchPaints` from `paint-service.ts` via a thin server action, or use an existing exposed search action if one exists)
- Renders up to 10 suggestions with brand + hex swatch
- Clicking a suggestion calls `addPaintToCollection(userId, paint.id)` via `useTransition`
- Clears input on success
- Show "Already in collection" message on unique-violation error

Commit: `feat(admin): add admin collection components`

### Step 5: Collection page

Create `src/app/admin/users/[id]/collection/page.tsx` (server component):

1. Await `params`, call `getUserCollection(userId)`. Return `notFound()` if profile missing.
2. Get current admin user via `supabase.auth.getUser()` to compute `isSelf = currentUser.id === userId`.
3. Render:
   - Back link: `← Back to user` → `/admin/users/[id]`
   - Header: avatar, display name, email, paint count badge
   - `<AdminAddPaintForm userId={userId} />` (hidden when `isSelf`)
   - `<AdminUserCollectionSearch userId={userId} initialPaints={collection.paints} />`

Commit: `feat(admin): add admin user collection page`

### Step 6: User detail link

Modify `src/app/admin/users/[id]/page.tsx` — add a "Collection" link below the existing back-to-users link, or within a secondary nav row on the page:

```tsx
<Link href={`/admin/users/${id}/collection`} className="...">
  View collection →
</Link>
```

Match the existing link style on the page.

Commit: `feat(admin): add collection link to user detail page`

### Step 7: Build and verify

1. `npm run build` and `npm run lint` pass.
2. Manual test scenarios:
   - Admin visits `/admin/users/[id]` → "View collection" link is visible.
   - Admin visits `/admin/users/[id]/collection` → paint grid renders.
   - Search filters the grid correctly (name, brand, hex).
   - Ellipsis dropdown appears on each card; "Remove" removes the paint.
   - Add-paint form finds paints and adds them; grid updates.
   - Admin cannot see add/remove controls on their own collection page.
   - Server actions reject self-modification even if called directly.
   - Non-admin visiting `/admin/users/[id]/collection` is redirected (middleware).

## Key Design Decisions

1. **Route under `/admin/users/[id]/collection`, not `/admin/collections/[userId]`.** The collection is a property of the user. Placing it under the user's URL segment keeps the admin hierarchy consistent and lets the user detail page serve as the natural entry point.
2. **Debounced client-side search, not URL-synced.** Mirrors the user-facing collection search — fast, no page reload, and the collection page is not a shareable filtered view. URL-sync would add complexity without benefit here.
3. **Paint card grid, not a table.** Matches the visual language of `/collection/paints`. Admins get the same browsable, color-rich view as users.
4. **Ellipsis dropdown per card, not a separate remove button.** Scales cleanly to future actions (e.g., view paint detail, add to another user's collection) without cluttering the card surface.
5. **Additive admin RLS policies, no service-role client.** Existing user-scoped policies remain; admin-scoped policies are added on top. No `SUPABASE_SECRET_KEY` leakage risk.
6. **Self-protection at the action layer.** Every mutation action rejects when `userId === currentUser.id`. The UI also hides controls, but the action check is authoritative.

## Risks & Considerations

- **Hard dependency on `user_paints` table.** If `00-manage-collection.md` has not landed, pause and implement that first.
- **RLS subtlety.** Admin policies depend on `get_user_roles`. Test that: (a) admin can read/write any row, (b) non-admin cannot read another user's row, (c) non-admin can still read/write their own.
- **Paint-picker performance.** Reuse `paintService.searchPaints()` which already handles name+brand search. Fine at current paint volume.
- **JS-based search filtering.** `searchUserCollection` fetches all of a user's collection then filters in JS (same trade-off as `CollectionService.searchCollection` — nested brand name prevents efficient Supabase `.ilike` on brand). Acceptable for typical collection sizes; revisit if collections grow past ~1k paints.
