'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { normalizePalettePositions } from '@/modules/palettes/utils/normalize-palette-positions'

/**
 * Server action that removes a single paint slot from a palette.
 *
 * Filters out the slot at `position`, renumbers the remaining slots to close
 * the gap, then atomically replaces all slots via `setPalettePaints`.
 * Revalidates `/user/palettes`, the public catalog, the palette detail page,
 * and the owner edit page. Returns `{ error }` on any failure; no redirect.
 *
 * @param paletteId - UUID of the palette to modify.
 * @param position - 0-based slot index to remove.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function removePalettePaint(
  paletteId: string,
  position: number
): Promise<{ error: string } | undefined> {
  if (!paletteId || position < 0) return { error: 'Invalid palette or position.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to modify a palette.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }

  if (palette.userId !== user.id) {
    return { error: 'You can only remove paints from palettes you own.' }
  }

  const remaining = palette.paints.filter((p) => p.position !== position)
  const normalized = normalizePalettePositions(remaining)

  try {
    await service.setPalettePaints(paletteId, normalized)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove paint.'
    return { error: message }
  }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
