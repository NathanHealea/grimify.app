# Profile & Account Merging

**Epic:** User Management
**Type:** Feature
**Status:** Todo

## Summary

Allow administrators to merge duplicate user profiles into a single canonical profile. When two profiles represent the same person (e.g., a user signed in with both email and OAuth creating separate accounts), the admin can select a source profile to merge into a target profile. The merge atomically transfers all associated data — role assignments and profile metadata — from the source to the target, then deletes the source profile.

This approach is modeled after the [grimdark.nathanhealea.com](https://grimdark.nathanhealea.com) project's admin profile merging feature, adapted for Grimify's data model. As new data tables are added (paint collections, recipes, palettes, community content), the merge function will be extended to transfer those records as well.

## Acceptance Criteria

- [ ] Admins can select a source profile to merge into the current (target) profile
- [ ] A merge preview shows what will be transferred before execution (role count, profile data that will carry over)
- [ ] The merge operation is atomic — either everything transfers or nothing does
- [ ] After merge, the source profile is deleted and all its role assignments transfer to the target
- [ ] Duplicate role assignments are handled gracefully (ON CONFLICT DO NOTHING)
- [ ] Target profile data takes precedence; source data fills in only where target is null (bio, avatar)
- [ ] Admins cannot merge a profile into itself
- [ ] A confirmation dialog warns that the merge is irreversible and the source will be permanently deleted
- [ ] Non-admin users cannot access merge functionality
- [ ] `npm run build` and `npm run lint` pass with no errors

## Problem Scenarios

### Scenario 1: Email and OAuth create separate accounts

1. User signs up with email/password → profile "PainterJoe" created
2. Same user later signs in with Google (different auth path) → new profile "PainterJoe2" created
3. Two profiles exist for the same person

**Resolution:** Admin merges "PainterJoe2" (source) into "PainterJoe" (target). Role assignments transfer, source is deleted.

### Scenario 2: Duplicate sign-ups

1. User signs up, forgets their account, signs up again with a different email
2. Two profiles with separate auth accounts

**Resolution:** Admin merges the newer/less-used profile into the canonical one.

### Scenario 3: Test account cleanup

An admin created test profiles that need to be consolidated with real accounts.

**Resolution:** Admin merges test profiles into the real profiles.

## Routes

No new routes. Merge functionality is integrated into the admin user detail page.

| Route                   | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `/admin/users/[userId]` | Existing user detail page — add merge section         |

## Database

### Migration: Merge functions

Create `supabase/migrations/XXXXXX_add_merge_profiles.sql`:

#### `merge_preview(source_uuid, target_uuid)` function

Returns a preview of what will be transferred, without executing. The admin reviews this before confirming.

```sql
CREATE OR REPLACE FUNCTION public.merge_preview(source_uuid uuid, target_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
  source_profile public.profiles%ROWTYPE;
  target_profile public.profiles%ROWTYPE;
BEGIN
  -- Validate both profiles exist
  SELECT * INTO source_profile FROM public.profiles WHERE id = source_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source profile not found'; END IF;

  SELECT * INTO target_profile FROM public.profiles WHERE id = target_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target profile not found'; END IF;

  IF source_uuid = target_uuid THEN RAISE EXCEPTION 'Cannot merge a profile into itself'; END IF;

  SELECT jsonb_build_object(
    'source_display_name', source_profile.display_name,
    'target_display_name', target_profile.display_name,
    'roles_to_transfer', (
      SELECT count(*) FROM public.user_roles ur
      WHERE ur.user_id = source_uuid
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = target_uuid AND ur2.role_id = ur.role_id
        )
    ),
    'will_copy_bio', (source_profile.bio IS NOT NULL AND target_profile.bio IS NULL),
    'will_copy_avatar', (source_profile.avatar_url IS NOT NULL AND target_profile.avatar_url IS NULL)
  ) INTO result;

  RETURN result;
END;
$$;
```

#### `merge_profiles(source_uuid, target_uuid)` function

Atomically transfers all data from source to target, then deletes the source.

```sql
CREATE OR REPLACE FUNCTION public.merge_profiles(source_uuid uuid, target_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  roles_moved integer := 0;
  source_profile public.profiles%ROWTYPE;
  target_profile public.profiles%ROWTYPE;
BEGIN
  -- Validate both profiles exist
  SELECT * INTO source_profile FROM public.profiles WHERE id = source_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source profile not found'; END IF;

  SELECT * INTO target_profile FROM public.profiles WHERE id = target_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target profile not found'; END IF;

  IF source_uuid = target_uuid THEN RAISE EXCEPTION 'Cannot merge a profile into itself'; END IF;

  -- Transfer role assignments (skip duplicates)
  INSERT INTO public.user_roles (user_id, role_id, assigned_at)
    SELECT target_uuid, role_id, assigned_at
    FROM public.user_roles WHERE user_id = source_uuid
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS roles_moved = ROW_COUNT;

  -- Copy profile metadata where target is null
  UPDATE public.profiles SET
    bio = COALESCE(target_profile.bio, source_profile.bio),
    avatar_url = COALESCE(target_profile.avatar_url, source_profile.avatar_url),
    updated_at = now()
  WHERE id = target_uuid;

  -- Delete source profile (cascades to user_roles, and auth.users if linked)
  DELETE FROM public.profiles WHERE id = source_uuid;

  RETURN jsonb_build_object(
    'roles_moved', roles_moved,
    'source_deleted', true
  );
END;
$$;
```

### Future extensibility

When new tables are added to the schema, `merge_profiles` must be updated to transfer their records:

| Future table          | Merge behavior                                          |
| --------------------- | ------------------------------------------------------- |
| `user_collections`    | Transfer all entries, ON CONFLICT DO NOTHING for dupes  |
| `recipes`             | Update `author_id` from source to target                |
| `palettes`            | Update `author_id` from source to target                |
| `community_posts`     | Update `author_id` from source to target                |
| `comments`            | Update `author_id` from source to target                |

Each new table that references `profiles.id` should be added to both `merge_profiles` and `merge_preview`.

## Key Files

| Action | File                                                    | Description                                       |
| ------ | ------------------------------------------------------- | ------------------------------------------------- |
| Create | `supabase/migrations/XXXXXX_add_merge_profiles.sql`     | merge_profiles and merge_preview SQL functions    |
| Create | `src/modules/admin/actions/merge-preview.ts`            | Server action to fetch merge preview              |
| Create | `src/modules/admin/actions/merge-profiles.ts`           | Server action to execute the merge                |
| Create | `src/modules/admin/components/merge-profile-section.tsx` | Merge UI: profile selector, preview, confirmation |
| Modify | `src/app/admin/users/[userId]/page.tsx`                 | Add merge section and pass mergeable profiles     |

## Implementation

### Step 1: Database migration — Merge functions

Create `supabase/migrations/XXXXXX_add_merge_profiles.sql`:

1. Create `merge_preview(source_uuid, target_uuid)` function — returns preview data
2. Create `merge_profiles(source_uuid, target_uuid)` function — executes the merge
3. Both use `SECURITY DEFINER` to bypass RLS (permission checks happen in server actions)

### Step 2: Merge preview server action

Create `src/modules/admin/actions/merge-preview.ts`:

Not a form action — a plain async function called from the client:

```ts
async function getMergePreview(sourceId: string, targetId: string): Promise<MergePreview | { error: string }>
```

1. Validate admin role
2. Call `supabase.rpc('merge_preview', { source_uuid: sourceId, target_uuid: targetId })`
3. Return the preview data or error

### Step 3: Merge profiles server action

Create `src/modules/admin/actions/merge-profiles.ts`:

Form action using `useActionState` pattern:

1. Validate admin role
2. Extract `sourceId` and `targetId` from form data
3. Call `supabase.rpc('merge_profiles', { source_uuid: sourceId, target_uuid: targetId })`
4. On success: redirect to the target user's detail page with a success message
5. On error: return the error message

### Step 4: Merge UI component

Create `src/modules/admin/components/merge-profile-section.tsx`:

Client component with the following UX flow:

1. **Profile selector** — A dropdown listing all other profiles (`{ id, display_name }` passed as props from the server component). Shows display name and whether the profile is linked to an auth account.
2. **Preview button** — Enabled when a source profile is selected. Calls `getMergePreview()` and displays:
   - Source display name → Target display name
   - Roles that will transfer (count)
   - Whether bio/avatar will carry over
3. **Merge button** — Only appears after preview. Opens a confirmation dialog.
4. **Confirmation dialog** — Red warning text explaining this is irreversible. Shows: "Merge [source] into [target]. [Source] will be permanently deleted." Requires clicking "Confirm Merge" to proceed.
5. **Success state** — After merge, show a success message with stats (roles moved).

### Step 5: Integrate into user detail page

Modify `src/app/admin/users/[userId]/page.tsx`:

- Fetch all profiles except the current one: `supabase.from('profiles').select('id, display_name').neq('id', userId)`
- Pass as `mergeableProfiles` prop to `MergeProfileSection`
- Add the merge section below the profile and roles sections on the user detail page

### Step 6: Build and verify

Run `npm run build` and `npm run lint`.

## Key Design Decisions

1. **Source INTO target direction** — The source profile is absorbed into the target. The target keeps its identity (id, display_name, auth link). This matches the grimdark approach and is intuitive: "merge this duplicate into the canonical profile."
2. **SECURITY DEFINER for merge functions** — The merge function needs to delete profiles and transfer data across RLS boundaries. Permission enforcement happens in the server action layer via `hasRole()`, not in the SQL function.
3. **Preview before merge** — The preview step is critical for safety. Admins see exactly what will transfer before committing to an irreversible operation.
4. **Atomic transaction** — The merge function runs as a single SQL transaction. If any step fails (constraint violation, missing profile), nothing is committed.
5. **Target data takes precedence** — `COALESCE(target, source)` ensures the canonical profile's data is preserved. Source data only fills gaps.
6. **Extensible design** — The merge function is intentionally simple today (roles + profile metadata). As new tables are added (collections, recipes, palettes), the function grows to transfer those records too. The future extensibility table documents this contract.
7. **No automatic duplicate detection** — This feature is admin-initiated, not automated. Duplicate detection heuristics (same email across providers, similar display names) could be added later but are out of scope. Admins identify duplicates through the user list and their own knowledge of the user base.
