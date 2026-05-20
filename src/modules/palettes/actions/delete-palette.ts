'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import type { VoidResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that hard-deletes a palette and all its paint slots.
 *
 * On success, revalidates `/user/palettes` (owner dashboard) and `/palettes`
 * (public catalog drops a row) and redirects to `/user/palettes`. On auth
 * failure or a missing ID, returns `ok: false` without redirecting.
 *
 * @param id - The UUID of the palette to delete.
 * @returns {@link VoidResult} — redirects on success (never returns `ok: true`); `ok: false` with an error message on failure.
 */
export async function deletePalette(id: string): Promise<VoidResult> {
  if (!id) return { ok: false, error: 'Palette ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'You must be signed in to delete a palette.' }

  const service = createPaletteService(supabase)

  try {
    await service.deletePalette(id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete palette.'
    return { ok: false, error: message }
  }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  redirect('/user/palettes')
}
