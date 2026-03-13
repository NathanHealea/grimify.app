# User Profiles

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Create a profiles table in Supabase that auto-creates a profile when a user signs up. Profiles store display name and are linked to `auth.users`. Add auth helper utilities for fetching the authenticated user with their profile.

## Acceptance Criteria

- [ ] `profiles` table created via Supabase migration with columns: `id`, `display_name`, `avatar_url`, `bio`, `created_at`, `updated_at`
- [ ] Profile auto-created on user sign-up via database trigger
- [ ] RLS policies: authenticated users can read any profile, users can only update their own
- [ ] Auth helper `getAuthUser()` at `src/lib/supabase/auth.ts` fetches user with optional profile
- [ ] Profile type defined at `src/types/profile.ts`
- [ ] Users can view their own profile
- [ ] Users can edit their own profile (display name, avatar URL, bio)
- [ ] Users can delete their own account (cascades to profile)

## Implementation Plan

### Step 1: Create profiles migration

**`supabase/migrations/{timestamp}_create_profiles_table.sql`**

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS policies
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);
```

### Step 2: Create profile type

**`src/types/profile.ts`**
```typescript
export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}
```

### Step 3: Create auth helper

**`src/lib/supabase/auth.ts`** — `getAuthUser()` function that fetches the current user and optionally joins with the profile. Reference: `grimdark.nathanhealea.com/src/lib/supabase/auth.ts`

### Step 4: Create profile pages

**`src/app/profile/page.tsx`** — View own profile.
**`src/app/profile/edit/page.tsx`** — Edit own profile (display name, bio).
**`src/app/profile/delete/page.tsx`** — Delete account with confirmation.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_profiles_table.sql` | New — profiles table, triggers, RLS |
| `src/types/profile.ts` | New — Profile type definition |
| `src/lib/supabase/auth.ts` | New — getAuthUser helper |
| `src/app/profile/page.tsx` | New — view profile page |
| `src/app/profile/edit/page.tsx` | New — edit profile page |
| `src/app/profile/delete/page.tsx` | New — delete account page |

### Risks & Considerations

- The `ON DELETE CASCADE` on `auth.users` means deleting the auth user also deletes the profile. Account deletion should call `supabase.auth.admin.deleteUser()` from a server action using the service role key.
- Reference `grimdark.nathanhealea.com/supabase/migrations/20260217215309_create_profiles_table.sql` for the exact migration pattern.
