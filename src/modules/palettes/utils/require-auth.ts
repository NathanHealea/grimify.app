'use server'

import type { User, SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

/**
 * Verifies the caller is signed in.
 *
 * Returns the authenticated `User` and the bound `SupabaseClient` on success,
 * or an `{ ok: false, error }` result that can be returned directly from a
 * server action without additional error formatting.
 *
 * @returns `{ ok: true, user, supabase }` when signed in; `{ ok: false, error }` when not.
 */
export async function requireAuth(): Promise<
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'You must be signed in.' }
  return { ok: true, user, supabase }
}
