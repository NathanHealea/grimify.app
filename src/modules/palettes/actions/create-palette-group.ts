'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { validateGroupName } from '@/modules/palettes/validation'

/**
 * Server action that creates a new named group within a palette.
 *
 * Validates the group name, checks ownership, then inserts via
 * {@link createPaletteGroup}. Revalidates the palette detail and edit paths on
 * success.
 *
 * @param paletteId - UUID of the palette that will own the group.
 * @param name - Display name for the new group (1–100 characters).
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function createPaletteGroup(
  paletteId: string,
  name: string,
): Promise<{ error?: string } | undefined> {
  const nameError = validateGroupName(name)
  if (nameError) return { error: nameError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to create a group.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only add groups to palettes you own.' }

  const result = await service.createPaletteGroup(paletteId, name.trim())
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
