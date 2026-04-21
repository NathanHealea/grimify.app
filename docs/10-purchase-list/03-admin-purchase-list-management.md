# Admin Purchase List Management

**Epic:** Purchase List
**Type:** Feature
**Status:** Todo
**Branch:** `feature/admin-purchase-list-management`
**Merge into:** `v1/main`

## Summary

Admin interface for performing CRUD operations on every user's purchase list. Admins can browse all user purchase lists in a paginated list, drill into an individual user's list, add or remove paints on their behalf, edit per-paint notes, and clear an entire purchase list. UI and interaction patterns mirror `/admin/collections` (from `docs/08-user-management/06-collection-management.md`) — the same search + paginated table, detail page, confirmation dialogs, and admin-sidebar placement — so the admin section stays visually and behaviourally consistent.

## Acceptance Criteria

- [ ] Admins can view a paginated list of all users with their purchase list size (paint count) and last-updated timestamp
- [ ] Admins can search the list by display name or email (case-insensitive partial match), with URL-synced `?q=` state
- [ ] Admins can filter the list to show only users with at least one paint, only users with empty purchase lists, or all users
- [ ] Admins can open a user's purchase list detail page showing every paint with brand, paint type, hex swatch, added date, and notes
- [ ] Admins can add a paint to any user's purchase list via a searchable paint picker
- [ ] Admins can remove a single paint from a user's purchase list with an inline confirmation
- [ ] Admins can edit the per-paint `notes` field inline
- [ ] Admins can clear an entire user's purchase list with a type-to-confirm dialog (typing the user's display name)
- [ ] Admin sidebar shows a "Purchase Lists" nav item alongside Dashboard / Users / Roles / Collections, with active-state highlighting
- [ ] Admins cannot mutate their own purchase list through the admin UI (prevents accidental self-modification; admins use `/purchase-list` for their own list)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|-------|-------------|
| `/admin/purchase-lists` | Paginated user list with purchase list size, search, filter |
| `/admin/purchase-lists/[userId]` | Detail page: user's purchase list with CRUD controls |

## Database

### Dependency

Depends on the `user_purchase_list` table from `00-purchase-list-schema.md`. That migration must land first.

### New migration — admin RLS policies

Create `supabase/migrations/XXXXXX_admin_purchase_list_policies.sql`:

```sql
CREATE POLICY "Admins can read all user_purchase_list"
  ON public.user_purchase_list FOR SELECT TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can insert into any user_purchase_list"
  ON public.user_purchase_list FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update any user_purchase_list"
  ON public.user_purchase_list FOR UPDATE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete any user_purchase_list"
  ON public.user_purchase_list FOR DELETE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));
```

Policies are additive — the existing `auth.uid() = user_id` policies continue to protect non-admin users.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/migrations/XXXXXX_admin_purchase_list_policies.sql` | Admin RLS policies on `user_purchase_list` |
| Create | `src/modules/admin/services/purchase-list-service.ts` | `listUserPurchaseLists`, `getUserPurchaseList`, `countUserPurchaseListPaints` |
| Create | `src/modules/admin/actions/add-paint-to-purchase-list.ts` | Server action: admin adds a paint to a user's purchase list |
| Create | `src/modules/admin/actions/remove-paint-from-purchase-list.ts` | Server action: admin removes a single paint |
| Create | `src/modules/admin/actions/update-purchase-list-note.ts` | Server action: update the `notes` field on a row |
| Create | `src/modules/admin/actions/clear-user-purchase-list.ts` | Server action: delete all rows for a given user |
| Create | `src/app/admin/purchase-lists/page.tsx` | Admin purchase list index page (search, filter, pagination) |
| Create | `src/app/admin/purchase-lists/[userId]/page.tsx` | Admin detail page for a specific user |
| Create | `src/modules/admin/components/purchase-lists-list-table.tsx` | Client table: users with list size + view link |
| Create | `src/modules/admin/components/purchase-list-size-filter.tsx` | URL-synced filter: all / non-empty / empty |
| Create | `src/modules/admin/components/user-purchase-list-table.tsx` | Client table: user's paints with inline remove + notes edit |
| Create | `src/modules/admin/components/add-paint-to-purchase-list-form.tsx` | Client paint-picker form |
| Create | `src/modules/admin/components/clear-purchase-list-dialog.tsx` | Type-to-confirm dialog for clearing a purchase list |
| Modify | `src/modules/admin/components/admin-sidebar.tsx` | Add "Purchase Lists" nav item |

### Existing files (pattern references — no changes)

| File | Why it's a reference |
|------|---------------------|
| `src/app/admin/collections/page.tsx` *(if implemented)* | Paginated list w/ search, filter, URL params — direct mirror |
| `src/app/admin/users/page.tsx` | Paginated list fallback reference |
| `src/modules/admin/services/collection-service.ts` *(if implemented)* | Service shape to mirror exactly |
| `src/modules/admin/actions/add-paint-to-collection.ts` *(if implemented)* | Server action pattern to mirror |
| `src/modules/admin/components/collections-list-table.tsx` *(if implemented)* | Table component to mirror |
| `src/modules/admin/components/clear-collection-dialog.tsx` *(if implemented)* | Dialog to mirror |
| `src/modules/user/components/delete-user-dialog.tsx` | Type-to-confirm dialog pattern |
| `docs/08-user-management/06-collection-management.md` | Authoritative implementation reference for all patterns |

## Implementation

### Step 1: Migration — admin policies

Create `supabase/migrations/XXXXXX_admin_purchase_list_policies.sql` with the policies above. Apply and regenerate types:

```bash
npx supabase migration up
npm run db:types
```

Commit: `feat(purchase-list): add admin RLS policies on user_purchase_list`

### Step 2: Admin collection service

Create `src/modules/admin/services/purchase-list-service.ts` — mirrors `collection-service.ts` in the admin module (see `docs/08-user-management/06-collection-management.md` Step 2 for the exact shape):

- `listUserPurchaseLists({ q, sizeFilter, offset, limit })` — Returns `{ users, count }`:
  - Joins `profiles` with `user_purchase_list` count per user and `MAX(updated_at)` as `last_activity`.
  - `q` → case-insensitive partial match on `display_name` and `email`.
  - `sizeFilter === 'non-empty'` → filter to users with at least one row.
  - `sizeFilter === 'empty'` → filter to users with no rows.
  - Pagination via `.range(offset, offset + limit - 1)` with `{ count: 'exact' }`.
- `getUserPurchaseList(userId)` — Returns profile + array of purchase list entries joined to paints:
  ```ts
  supabase
    .from('user_purchase_list')
    .select('paint_id, added_at, updated_at, notes, paints(id, name, hex, paint_type, product_lines(brands(name)))')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
  ```
- `countUserPurchaseListPaints(userId)` — Returns `number`.

All methods use `createClient()` (anon key; admin RLS grants access). No service-role client.

Commit: `feat(purchase-list): add admin purchase list service`

### Step 3: Server actions

Create four server actions in `src/modules/admin/actions/`. Pattern: `'use server'`, validate caller, self-protection, mutate, revalidate, return `{ error?: string }`.

**`add-paint-to-purchase-list.ts`** — `addPaintToPurchaseList(userId: string, paintId: string)`
1. Get current user. Reject if unauthenticated.
2. Self-protection: reject if `userId === currentUser.id` with `"Use your own purchase list page to modify your paints"`.
3. Insert into `user_purchase_list`. Handle unique-violation (23505) → `"Paint already on this user's purchase list"`.
4. `revalidatePath('/admin/purchase-lists')` and `revalidatePath(\`/admin/purchase-lists/${userId}\`)`.

**`remove-paint-from-purchase-list.ts`** — `removePaintFromPurchaseList(userId: string, paintId: string)`
1. Self-protection as above.
2. `supabase.from('user_purchase_list').delete().eq('user_id', userId).eq('paint_id', paintId)`.
3. Revalidate both paths.

**`update-purchase-list-note.ts`** — `updatePurchaseListNote(userId: string, paintId: string, notes: string | null)`
1. Self-protection as above.
2. Trim `notes`; treat empty string as `null`.
3. Cap at 500 characters; reject if exceeded.
4. `supabase.from('user_purchase_list').update({ notes }).eq('user_id', userId).eq('paint_id', paintId)`.
5. Revalidate detail path only.

**`clear-user-purchase-list.ts`** — `clearUserPurchaseList(userId: string)`
1. Self-protection as above.
2. `supabase.from('user_purchase_list').delete().eq('user_id', userId)`.
3. Revalidate both paths.

Commit: `feat(purchase-list): add admin CRUD server actions for purchase lists`

### Step 4: Purchase lists index page

Create `src/app/admin/purchase-lists/page.tsx` — mirrors `src/app/admin/collections/page.tsx`:

1. Accepts `searchParams: { q?: string; filter?: 'empty' | 'non-empty'; page?: string }`.
2. `PAGE_SIZE = 20`.
3. Calls `listUserPurchaseLists({ q, sizeFilter: filter, offset, limit: PAGE_SIZE })`.
4. Renders: page header, `UserSearch` (with `basePath="/admin/purchase-lists"`), `<PurchaseListSizeFilter />`, `<PurchaseListsListTable />`, pagination.

Create `src/modules/admin/components/purchase-list-size-filter.tsx` — client component with a `<select>` dropdown ("All", "With paints", "Empty"), URL-synced via `useRouter().replace()`, resets `?page=1` on change. Mirrors `CollectionSizeFilter`.

Create `src/modules/admin/components/purchase-lists-list-table.tsx` — client component:
- **Columns:** Avatar + display name, Email, Paints (count), Last activity, Actions.
- **Actions:** "View" link to `/admin/purchase-lists/[userId]`.
- Row click: whole row links to detail page.
- Empty state: "No users match the current filters".

Commit: `feat(purchase-list): add admin purchase lists index page`

### Step 5: Purchase list detail page

Create `src/app/admin/purchase-lists/[userId]/page.tsx`:

1. Await `params`, call `getUserPurchaseList(userId)`. Return `notFound()` if profile missing.
2. Fetch current admin user via `auth.getUser()` to derive `isSelf` flag.
3. Render:
   - Header: avatar, display name, email, paint count, last activity timestamp
   - `<AddPaintToPurchaseListForm userId={userId} />` (hidden when `isSelf`)
   - `<UserPurchaseListTable userId={userId} entries={entries} isSelf={isSelf} />`
   - `<ClearPurchaseListDialog userId={userId} displayName={profile.display_name} paintCount={entries.length} isSelf={isSelf} />` (hidden when `isSelf` or count is 0)

Create `src/modules/admin/components/user-purchase-list-table.tsx` — mirrors `user-collection-table.tsx`:
- **Columns:** Hex swatch, Paint name + brand (link to `/paints/[id]`), Paint type, Added, Notes (inline-editable), Actions.
- **Notes editing:** click-to-edit; `useTransition` calls `updatePurchaseListNote`.
- **Remove action:** inline one-click-arms pattern. Disabled when `isSelf`.
- Empty state: "This user has no paints on their purchase list".

Create `src/modules/admin/components/add-paint-to-purchase-list-form.tsx` — mirrors `add-paint-to-collection-form.tsx`:
- Search input that queries paints via `paintService.searchPaints`.
- Renders up to 10 suggestions with brand + swatch.
- Clicking a suggestion calls `addPaintToPurchaseList(userId, paint.id)` via `useTransition`.
- On success: clears input, relies on `revalidatePath` to re-render the table.

Create `src/modules/admin/components/clear-purchase-list-dialog.tsx` — mirrors `clear-collection-dialog.tsx`:
- Native `<dialog>`, trigger button labelled "Clear purchase list".
- Type-to-confirm input (must match user's display name).
- On confirm, calls `clearUserPurchaseList(userId)` via `useTransition`.

Commit: `feat(purchase-list): add admin purchase list detail page and components`

### Step 6: Admin sidebar

Modify `src/modules/admin/components/admin-sidebar.tsx` — add `'Purchase Lists'` to `NAV_ITEMS`:

```ts
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/roles', label: 'Roles' },
  { href: '/admin/collections', label: 'Collections' },   // if implemented
  { href: '/admin/purchase-lists', label: 'Purchase Lists' },
]
```

If the Collections nav item from `06-collection-management.md` has not yet been implemented, omit it — do not create a dependency on an unmerged feature.

Commit: `feat(purchase-list): add Purchase Lists link to admin sidebar`

### Step 7: Build and verify

1. `npm run build && npm run lint` pass.
2. Manual test scenarios (match `06-collection-management.md` Step 7):
   - Non-admin visiting `/admin/purchase-lists` is redirected by middleware.
   - Admin sees every user in the list, including users with empty purchase lists.
   - Search and size filter work correctly.
   - Detail page shows correct paints and counts.
   - Add, remove, edit notes, and clear operations all work and revalidate.
   - Admin cannot mutate their own list from the admin UI (controls hidden).
   - Adding a duplicate paint shows the "already on list" error.

## Key Design Decisions

1. **Mirrors collection management exactly.** Every component, service, action, and page in this feature is a direct parallel of `docs/08-user-management/06-collection-management.md`. This keeps the admin UI visually and behaviourally consistent.
2. **Additive admin RLS policies.** Same approach as collection management: admin policies added on top of user-scoped policies. No service-role client introduced.
3. **Self-protection at the action layer.** Every mutation action refuses when `userId === currentUser.id`. UI also hides controls as defense-in-depth.
4. **Type-to-confirm only for "clear all".** Single-paint removes use inline one-click-arms; typed confirmation reserved for wiping an entire list.
5. **URL-based pagination and search state.** Consistent with all other admin list pages.

## Risks & Considerations

- **Dependency on schema feature.** `user_purchase_list` table must exist before any of these actions or pages can work.
- **Dependency on `06-collection-management.md` (soft).** The step-by-step implementation instructions in that doc are the authoritative reference. If that feature has not been implemented, the same patterns still apply — just refer to the reference files listed in that doc directly.
- **Admin RLS on `user_purchase_list`.** Any bug in `get_user_roles` immediately affects access. Test: (a) admin can read/write any row, (b) non-admin cannot read/write another user's row, (c) non-admin can still read/write their own rows.
- **Paint-picker performance.** Reuse `paintService.searchPaints()` which handles brand+name search efficiently.
- **`Collections` sidebar item.** If `06-collection-management.md` is not yet implemented when this feature lands, omit the Collections item from the sidebar to avoid a broken link.
