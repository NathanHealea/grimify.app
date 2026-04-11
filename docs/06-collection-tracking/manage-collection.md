# Add/Remove Paints to Personal Collection

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Todo

## Summary

Allow authenticated users to add and remove paints from their personal collection, creating a digital inventory of the paints they own.

## Acceptance Criteria

- [ ] Authenticated users can add a paint to their collection from any paint detail view
- [ ] Users can remove a paint from their collection
- [ ] A visual indicator shows whether a paint is already in the user's collection
- [ ] The add/remove action provides immediate feedback (optimistic UI)
- [ ] Collection state is persisted in the database
- [ ] `npm run build` and `npm run lint` pass with no errors

## Database

### `user_paints` Table

| Column | Type | Constraints |
|---|---|---|
| `user_id` | `uuid` | FK to `profiles.id` on delete cascade, part of composite PK |
| `paint_id` | `int` | FK to `paints.id` on delete cascade, part of composite PK |
| `added_at` | `timestamptz` | Not null, default `now()` |
| `notes` | `text` | Nullable (personal notes about the paint) |

Composite primary key on `(user_id, paint_id)`.

### Row Level Security

- **SELECT**: Users can read their own collection (`auth.uid() = user_id`)
- **INSERT**: Users can add to their own collection (`auth.uid() = user_id`)
- **DELETE**: Users can remove from their own collection (`auth.uid() = user_id`)

## Key Files

| Action | File | Description |
|---|---|---|
| Create | `supabase/migrations/XXXXXX_create_user_paints_table.sql` | Migration for user_paints table |
| Create | `src/modules/collection/actions.ts` | Server actions for add/remove paint |
| Create | `src/components/collection-toggle.tsx` | Add/remove button component |
| Create | `src/types/collection.ts` | TypeScript types |

## Implementation

### 1. Database migration

Create the `user_paints` table with RLS policies scoped to the authenticated user.

### 2. Server actions

- `addToCollection(paintId)` — Inserts a row into `user_paints`
- `removeFromCollection(paintId)` — Deletes the row from `user_paints`

### 3. Collection toggle component

A button/icon that shows filled state when the paint is in the collection and empty state when not. Clicking toggles the state with optimistic UI update.

## Notes

- The `notes` field allows users to add personal notes (e.g., "almost empty", "bought 2024").
- Collection data is private by default (only visible to the owner). The Community & Social epic adds optional public sharing.
- This feature requires authentication — the toggle component should prompt sign-in for unauthenticated users.
