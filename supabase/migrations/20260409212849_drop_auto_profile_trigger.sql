-- Drop the auto-profile creation trigger so profiles are created during setup instead
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
