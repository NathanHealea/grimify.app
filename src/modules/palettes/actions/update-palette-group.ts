'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { validateGroupName } from '@/modules/palettes/validation'

/**
 * Server action that renames an existing palette group.
 *
 * Takes `paletteId` to run the standard ownership check without a reverse
 * lookup from `groupId`. Validates the new name, then persists via
 * {@link updatePaletteGroup}. Revalidates the palette detail and edit paths on
 * success.
 *
 * @param paletteId - UUID of the parent palette (used for ownership check).
 * @param groupId - UUID of the group to update.
 * @param name - New display name (1–100 characters).
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function updatePaletteGroup(
  paletteId: string,
  groupId: string,
  name: string,
): Promise<{ error?: string } | undefined> {
  const nameError = validateGroupName(name)
  if (nameError) return { error: nameError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to update a group.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only update groups on palettes you own.' }

  const result = await service.updatePaletteGroup(groupId, { name: name.trim() })
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
