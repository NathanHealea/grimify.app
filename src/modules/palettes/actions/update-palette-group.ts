'use server'

import { revalidatePath } from 'next/cache'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
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

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service } = auth

  const result = await service.updatePaletteGroup(groupId, { name: name.trim() })
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
