'use server'

import { revalidatePath } from 'next/cache'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
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

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service } = auth

  const result = await service.createPaletteGroup(paletteId, name.trim())
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
