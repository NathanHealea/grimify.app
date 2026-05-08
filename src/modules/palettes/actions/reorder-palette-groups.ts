'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that persists a new group order for a palette.
 *
 * Accepts the full ordered list of `{ id, position }` entries and batch-updates
 * each group's `position` via {@link reorderPaletteGroups}. Revalidates the
 * palette detail and edit paths on success.
 *
 * @param paletteId - UUID of the palette whose groups are being reordered.
 * @param ordered - Complete ordered list with new `position` values (0-based).
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderPaletteGroups(
  paletteId: string,
  ordered: Array<{ id: string; position: number }>,
): Promise<{ error?: string } | undefined> {
  if (!paletteId || !Array.isArray(ordered)) {
    return { error: 'Invalid reorder request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to reorder groups.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only reorder groups on palettes you own.' }

  const result = await service.reorderPaletteGroups(paletteId, ordered)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
