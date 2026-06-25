'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/**
 * Server action that permanently deletes the authenticated user's own account.
 *
 * Calls the `delete_own_account` RPC (SECURITY DEFINER) which enforces that:
 * - The caller is authenticated
 * - The caller is not an admin (admin self-deletion is blocked at the database level)
 *
 * On success, signs out the session and redirects to `/`. The sign-out must happen
 * server-side so the session cookie is cleared before the browser navigates away.
 *
 * @returns An object with an `error` message string on failure, or redirects on success.
 */
export async function deleteOwnAccount(): Promise<{ error: string }> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('delete_own_account')

  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/')
}
