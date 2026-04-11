'use server'

import { createClient } from '@/lib/supabase/server'
import { type ProfileFormState, validateDisplayName } from '@/modules/profile/validation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function setupProfile(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to complete your profile.' }
  }

  const displayName = (formData.get('display_name') as string) ?? ''
  const validationError = validateDisplayName(displayName)

  if (validationError) {
    return { errors: { display_name: validationError } }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    // Handle unique constraint violation (display name already taken)
    if (error.code === '23505') {
      return { errors: { display_name: 'Display name is already taken.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
