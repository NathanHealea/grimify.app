'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that hard-deletes a palette and all its paint slots.
 *
 * On success, revalidates `/palettes` and redirects to `/palettes`. On
 * auth failure or a missing ID, returns an error object without redirecting.
 *
 * @param id - The UUID of the palette to delete.
 * @returns `undefined` on success (redirect fires); `{ error: string }` on failure.
 */
export async function deletePalette(id: string): Promise<{ error: string } | undefined> {
  if (!id) return { error: 'Palette ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to delete a palette.' }

  const service = createPaletteService(supabase)

  try {
    await service.deletePalette(id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete palette.'
    return { error: message }
  }

  revalidatePath('/palettes')
  redirect('/palettes')
}
