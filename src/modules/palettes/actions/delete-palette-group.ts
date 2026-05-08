'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that deletes a palette group.
 *
 * Deletion is non-destructive to paint data — member paints become ungrouped
 * (`group_id = NULL`) via the `ON DELETE SET NULL` FK constraint. Takes
 * `paletteId` to run the standard ownership check without a reverse lookup.
 * Revalidates the palette detail and edit paths on success.
 *
 * @param paletteId - UUID of the parent palette (used for ownership check).
 * @param groupId - UUID of the group to delete.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function deletePaletteGroup(
  paletteId: string,
  groupId: string,
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to delete a group.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only delete groups on palettes you own.' }

  const result = await service.deletePaletteGroup(groupId)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
