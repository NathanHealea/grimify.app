'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that assigns (or removes) a group for a single paint slot.
 *
 * Updates `group_id` on the `palette_paints` row identified by
 * `(paletteId, position)`. Pass `groupId = null` to move the paint back to
 * the ungrouped section. Revalidates the palette detail and edit paths on
 * success.
 *
 * @param paletteId - UUID of the parent palette.
 * @param position - 0-based slot index of the paint to reassign.
 * @param groupId - Target group UUID, or `null` to ungroup.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function assignPaintToGroup(
  paletteId: string,
  position: number,
  groupId: string | null,
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to assign a paint to a group.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only modify palettes you own.' }

  const result = await service.assignPaintToGroup(paletteId, position, groupId)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
