import type { User } from '@supabase/supabase-js'

import type { Profile } from '@/types/profile'

import { createClient } from './server'

/** Return shape when `withProfile` is false (default) */
interface AuthUserResult {
  user: User
}

/** Return shape when `withProfile` is true */
interface AuthUserWithProfileResult {
  user: User
  profile: Profile | null
}

/** Options for `getAuthUser` */
interface GetAuthUserOptions {
  withProfile?: boolean
}

export async function getAuthUser(): Promise<AuthUserResult | null>
export async function getAuthUser(options: { withProfile: true }): Promise<AuthUserWithProfileResult | null>
export async function getAuthUser(options?: GetAuthUserOptions): Promise<AuthUserResult | AuthUserWithProfileResult | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.email_confirmed_at) {
    return null
  }

  if (options?.withProfile) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    return { user, profile: (profile as Profile) ?? null }
  }

  return { user }
}
