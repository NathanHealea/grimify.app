# User Profiles and Shared Collections

**Epic:** Community & Social
**Type:** Feature
**Status:** Todo

## Summary

Provide public user profile pages where painters can showcase their recipes, palettes, and optionally their paint collection.

## Acceptance Criteria

- [ ] Each user has a public profile page accessible by display name
- [ ] Profile shows display name, avatar, bio, and join date
- [ ] Profile lists the user's public recipes and palettes
- [ ] Users can optionally share their paint collection publicly
- [ ] Profile edit page allows updating display name, bio, and avatar
- [ ] Privacy toggle for collection visibility (private by default)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|---|---|
| `/u/[displayName]` | Public user profile |
| `/profile/edit` | Edit own profile (auth required) |

## Database Changes

Add to `profiles` table:

| Column | Type | Constraints |
|---|---|---|
| `collection_public` | `boolean` | Not null, default `false` |

### Row Level Security Updates

- `user_paints` SELECT policy: Allow public read when the owner's `profiles.collection_public` is `true`

## Key Files

| Action | File | Description |
|---|---|---|
| Create | `src/app/u/[displayName]/page.tsx` | Public profile page |
| Create | `src/app/profile/edit/page.tsx` | Profile edit page |
| Create | `src/app/profile/edit/edit-profile-form.tsx` | Profile edit form component |
| Create | `src/app/profile/edit/actions.ts` | Profile update server actions |
| Create | `supabase/migrations/XXXXXX_add_collection_public.sql` | Add collection_public column |

## Implementation

### 1. Public profile page

A page that fetches the user's profile by display name and shows their public content: bio, avatar, recipes, palettes, and optionally their paint collection.

### 2. Profile edit page

A form for updating display name, bio, avatar URL, and collection visibility toggle. Uses server actions for updates.

### 3. Collection privacy

The `collection_public` flag on `profiles` controls whether the user's paint collection is visible on their public profile. Default is private. The RLS policy on `user_paints` is updated to allow public reads when this flag is true.

## Notes

- Profile URLs use display names (`/u/paintmaster42`) for human-readable links.
- Avatar upload could use Supabase Storage (or accept URL input for MVP).
- The profile page aggregates content from multiple tables — consider a server component with parallel data fetching.
