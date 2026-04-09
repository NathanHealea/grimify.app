import type { User } from '@supabase/supabase-js';

import type { Profile } from '@/types/profile';

import { createClient } from './server';

type AuthResult = { user: User };
type AuthResultWithProfile = { user: User; profile: Profile };

export async function getAuthUser(options: { withProfile: true }): Promise<AuthResultWithProfile | null>;
export async function getAuthUser(options?: { withProfile?: false }): Promise<AuthResult | null>;
export async function getAuthUser(options?: {
  withProfile?: boolean;
}): Promise<AuthResult | AuthResultWithProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  if (options?.withProfile) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (!profile) return null;

    return { user, profile: profile as Profile };
  }

  return { user };
}
