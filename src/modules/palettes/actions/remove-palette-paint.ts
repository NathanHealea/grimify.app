'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that removes a single paint from a palette's master list.
 *
 * Deletes the `palette_paints` row by its stable `id`. The FK cascade on
 * `palette_group_paints.palette_paint_id` removes every group membership for
 * this paint automatically. Remaining master-list positions are renumbered via
 * `reorder_palette_paints_v2`. Revalidates `/user/palettes`, the public catalog,
 * the palette detail page, and the owner edit page. Returns `{ error }` on any
 * failure; no redirect.
 *
 * @param paletteId - UUID of the palette to modify.
 * @param palettePaintId - Stable UUID of the master-list entry to remove.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function removePalettePaint(
  paletteId: string,
  palettePaintId: string,
): Promise<{ error: string } | undefined> {
  if (!paletteId || !palettePaintId) return { error: 'Invalid palette or paint.' }

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

  const result = await service.removePalettePaint(paletteId, palettePaintId)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
