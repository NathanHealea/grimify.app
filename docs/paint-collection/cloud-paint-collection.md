# Cloud Paint Collection

**Epic:** Paint Collection
**Type:** Feature
**Status:** Todo

## Summary

Migrate the user's paint collection from browser localStorage to a Supabase database table. Authenticated users' collections are stored server-side, tied to their profile. Unauthenticated users continue using localStorage as a guest experience. Users can add and remove paints from their collection. Administrators can view, add, and remove paints from any user's collection via an admin page.

## Acceptance Criteria

- [ ] `user_paint_collection` table created in Supabase linking user IDs to paint IDs
- [ ] RLS policies: users can read/insert/delete their own collection entries
- [ ] RLS policies: administrators can read/insert/delete any user's collection entries
- [ ] `useOwnedPaints` hook updated to sync with Supabase when authenticated
- [ ] Unauthenticated users continue using localStorage (guest mode)
- [ ] On sign-in, localStorage collection is merged into the database (one-time migration)
- [ ] On sign-out, collection state is cleared from the client (but preserved in database)
- [ ] Admin page at `/admin/collections` to view and manage any user's collection
- [ ] Admin can search for a user and view their collection
- [ ] Admin can add or remove paints from any user's collection
- [ ] Existing UI (CollectionPanel, DetailPanel, ColorWheel buttons) works without changes — only the hook's backing store changes

## Implementation Plan

### Step 1: Create database migration

**`supabase/migrations/{timestamp}_create_user_paint_collection.sql`**

```sql
CREATE TABLE public.user_paint_collection (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  paint_id TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, paint_id)
);

CREATE INDEX idx_user_paint_collection_user_id ON public.user_paint_collection(user_id);

ALTER TABLE public.user_paint_collection ENABLE ROW LEVEL SECURITY;

-- Users can read their own collection
CREATE POLICY "Users can read own collection"
  ON public.user_paint_collection FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can add to their own collection
CREATE POLICY "Users can insert own collection"
  ON public.user_paint_collection FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own collection
CREATE POLICY "Users can delete own collection"
  ON public.user_paint_collection FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read any user's collection
CREATE POLICY "Admins can read any collection"
  ON public.user_paint_collection FOR SELECT TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

-- Admins can add to any user's collection
CREATE POLICY "Admins can insert any collection"
  ON public.user_paint_collection FOR INSERT TO authenticated
  WITH CHECK ('administrator' = ANY(public.get_user_roles(auth.uid())));

-- Admins can remove from any user's collection
CREATE POLICY "Admins can delete any collection"
  ON public.user_paint_collection FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));
```

**Notes:**
- `paint_id` is a `TEXT` column matching the current ID format: `${brand}-${name}-${type}` (e.g., `citadel-Abaddon Black-Base`). This keeps compatibility with the existing client-side ID generation.
- `ON DELETE CASCADE` on `profiles` ensures collection is cleaned up when a user deletes their account.

### Step 2: Create collection service

**`src/lib/supabase/collection.ts`** — Server-side and client-side functions for collection CRUD:

```typescript
// Client-side functions (use browser Supabase client)
export async function fetchUserCollection(supabase, userId): Promise<Set<string>>
export async function addToCollection(supabase, userId, paintId): Promise<void>
export async function removeFromCollection(supabase, userId, paintId): Promise<void>
export async function bulkAddToCollection(supabase, userId, paintIds: string[]): Promise<void>

// Admin functions (use admin Supabase client, server-side only)
export async function fetchAnyUserCollection(adminClient, userId): Promise<Set<string>>
export async function adminAddToCollection(adminClient, userId, paintId): Promise<void>
export async function adminRemoveFromCollection(adminClient, userId, paintId): Promise<void>
```

### Step 3: Update `useOwnedPaints` hook

**`src/hooks/useOwnedPaints.ts`** — Refactor to support both localStorage (guest) and Supabase (authenticated) backing stores.

```typescript
export function useOwnedPaints(userId?: string) {
  // If userId is provided → authenticated mode (Supabase)
  // If no userId → guest mode (localStorage, current behavior)

  // Authenticated mode:
  // - On mount, fetch collection from Supabase
  // - toggleOwned calls addToCollection/removeFromCollection
  // - Returns loading state for initial fetch

  // Guest mode:
  // - Current localStorage behavior unchanged
}
```

**Key behaviors:**
- The hook signature changes to accept an optional `userId`
- Returns `{ ownedIds, toggleOwned, loading }` (adds `loading` for async fetch)
- `page.tsx` passes the authenticated user's ID when available, or `undefined` for guests

### Step 4: Add localStorage-to-database migration on sign-in

**`src/hooks/useOwnedPaints.ts`** or **`src/lib/supabase/collection.ts`**

When a user signs in and has items in localStorage:
1. Read localStorage collection
2. Fetch database collection
3. Merge: add any localStorage IDs not already in the database via `bulkAddToCollection`
4. Clear localStorage collection (it's now in the database)
5. Use database as the source of truth going forward

This runs once on sign-in and handles the transition from guest to authenticated.

### Step 5: Update `page.tsx` to pass auth context

**`src/app/page.tsx`**

```typescript
// Get auth state (user ID) and pass to useOwnedPaints
const { ownedIds, toggleOwned, loading } = useOwnedPaints(user?.id)
```

This requires the page to know the current user's ID. Options:
- Pass it from a server component via props
- Use a `useAuth` client-side hook that checks Supabase session state
- Use the auth context from the Navbar Auth UI feature

The exact approach depends on how Epic 8 (User Authentication) implements the auth state flow. The simplest approach: create a `useUser` hook using the browser Supabase client that returns the current user or `null`.

### Step 6: Handle sign-out cleanup

When the user signs out:
- Clear the in-memory `ownedIds` state
- Do NOT clear the database (collection persists for next sign-in)
- Do NOT restore localStorage (guest starts fresh)

Listen for Supabase auth state changes in the hook:
```typescript
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    setOwnedIds(new Set())
  }
})
```

### Step 7: Create admin collection management page

**`src/app/admin/collections/page.tsx`** — Admin page to manage user collections:

- Search for users by display name or email
- Select a user to view their collection
- Display collection as a list with paint name, brand, hex swatch, and remove button
- Add paints to a user's collection via a paint search/picker
- Remove paints with confirmation

**`src/app/admin/collections/actions.ts`** — Server actions:
- `getUsers()` — List users with profiles (for search)
- `getUserCollection(userId)` — Fetch a user's collection with paint details
- `adminAddPaint(userId, paintId)` — Add paint to user's collection
- `adminRemovePaint(userId, paintId)` — Remove paint from user's collection

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_user_paint_collection.sql` | New — collection table with RLS |
| `src/lib/supabase/collection.ts` | New — collection CRUD functions |
| `src/hooks/useOwnedPaints.ts` | Refactor — dual localStorage/Supabase backing store |
| `src/app/page.tsx` | Pass user ID to `useOwnedPaints`, handle loading state |
| `src/app/admin/collections/page.tsx` | New — admin collection management |
| `src/app/admin/collections/actions.ts` | New — admin server actions |

### Dependencies

This feature depends on:
- **[Supabase Setup](../user-authentication/supabase-setup.md)** — Supabase client helpers and middleware
- **[User Profiles](../user-authentication/user-profiles.md)** — `profiles` table that `user_paint_collection` references
- **[Role-Based Authorization](../user-authentication/role-based-authorization.md)** — `get_user_roles()` function used in admin RLS policies
- **[Navbar Auth UI](../user-authentication/navbar-auth-ui.md)** or equivalent — for determining auth state client-side

### Risks & Considerations

- **Paint ID format stability:** The `paint_id` column stores the client-generated ID (`${brand}-${name}-${type}`). If the paint data migration feature changes paint IDs, a data migration of collection entries will be needed.
- **Offline behavior:** When authenticated but offline, Supabase calls will fail. Consider falling back to localStorage temporarily and syncing when back online — or simply show an error toast. For MVP, failing gracefully with an error message is acceptable.
- **Race conditions:** If a user has two tabs open, collection changes in one tab won't reflect in the other until refresh. This is acceptable for MVP.
- **localStorage cleanup:** After migrating localStorage data to the database on sign-in, the localStorage key should be cleared to prevent re-migration on next sign-in.
- **Bulk insert performance:** The `bulkAddToCollection` function should use a single INSERT with multiple rows, not individual inserts, to minimize round-trips during migration.
- **UI loading state:** The `useOwnedPaints` hook now has an async initial load for authenticated users. The CollectionPanel and ColorWheel should handle the brief loading state gracefully (e.g., show the wheel immediately with no owned indicators, then update once loaded).
