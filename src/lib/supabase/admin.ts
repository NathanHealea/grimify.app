import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client authenticated with the service role key.
 *
 * This client bypasses Row Level Security and has access to the
 * `auth.admin.*` API methods (getUserById, updateUserById, etc.).
 * Must only be used in server-side code (server actions, server
 * components, API routes). Never import this in client components.
 *
 * @returns A Supabase client with service-role privileges.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
