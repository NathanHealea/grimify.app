'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ProfileSetupState = { error?: string; errors?: { display_name?: string } } | null;

export async function setupProfile(prevState: ProfileSetupState, formData: FormData): Promise<ProfileSetupState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in to create a profile.' };
  }

  const displayName = (formData.get('display_name') as string) ?? '';
  const trimmed = displayName.trim();

  if (!trimmed) {
    return { errors: { display_name: 'Display name is required.' } };
  }

  if (trimmed.length < 2 || trimmed.length > 50) {
    return { errors: { display_name: 'Display name must be between 2 and 50 characters.' } };
  }

  // Check uniqueness (case-insensitive)
  const { data: existing } = await supabase.from('profiles').select('id').ilike('display_name', trimmed).single();

  if (existing) {
    return { errors: { display_name: 'Display name is already taken.' } };
  }

  const { error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: trimmed,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { errors: { display_name: 'Display name is already taken.' } };
    }
    return { error: 'Failed to create profile. Please try again.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
