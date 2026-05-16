'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that adds a master-list paint to a named group.
 *
 * Creates a new `palette_group_paints` membership row at the end of the group.
 * The same paint may belong to multiple groups simultaneously. The operation is
 * idempotent — adding a paint that is already a member of the group is silently
 * ignored. Revalidates the palette detail and owner edit paths on success.
 *
 * @param paletteId - UUID of the parent palette (used for ownership check and revalidation).
 * @param groupId - UUID of the target group.
 * @param palettePaintId - Stable UUID of the master-list entry to add.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function addPaintToGroup(
  paletteId: string,
  groupId: string,
  palettePaintId: string,
): Promise<{ error?: string } | undefined> {
  if (!paletteId || !groupId || !palettePaintId) {
    return { error: 'Invalid palette, group, or paint.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to modify a palette.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only modify palettes you own.' }

  const result = await service.addPaintToGroup(groupId, palettePaintId)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
