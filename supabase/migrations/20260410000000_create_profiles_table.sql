-- Create the profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  bio text,
  avatar_url text,
  has_setup_profile boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive partial unique index on display_name
-- Allows multiple NULL values (incomplete profiles) without violating uniqueness
CREATE UNIQUE INDEX profiles_display_name_unique
  ON public.profiles (lower(display_name))
  WHERE display_name IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: No direct inserts allowed (trigger handles creation via SECURITY DEFINER)
-- No INSERT policy is created, so RLS blocks all direct inserts

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Helper: generate a unique ProfileDDDD display name
CREATE OR REPLACE FUNCTION public.generate_profile_name()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  LOOP
    candidate := 'Profile' || lpad(floor(random() * 10000)::int::text, 4, '0');
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(candidate)
    ) THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 100 THEN
      -- Extremely unlikely fallback — append extra random digits
      RETURN 'Profile' || floor(random() * 1000000)::int::text;
    END IF;
  END LOOP;
END;
$$;

-- Auto-create trigger function
-- Uses SECURITY DEFINER to bypass RLS when inserting the profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, has_setup_profile)
  VALUES (NEW.id, public.generate_profile_name(), false);
  RETURN NEW;
END;
$$;

-- Trigger: create a profile row after every new auth user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Login trigger: ensure a profile exists on every sign-in
-- Supabase updates last_sign_in_at on auth.users each login,
-- so an AFTER UPDATE trigger catches returning users who lack a profile.
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, has_setup_profile)
  VALUES (NEW.id, public.generate_profile_name(), false)
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, public.generate_profile_name()),
        updated_at = now()
    WHERE public.profiles.display_name IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();

-- Backfill: create profile rows for any existing auth users missing one
INSERT INTO public.profiles (id, display_name, has_setup_profile)
SELECT id, public.generate_profile_name(), false
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- Backfill: assign display names to existing profiles missing one
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE display_name IS NULL
  LOOP
    UPDATE public.profiles
      SET display_name = public.generate_profile_name(),
          updated_at = now()
      WHERE id = r.id;
  END LOOP;
END;
$$;
