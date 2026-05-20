'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'

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
  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service } = auth

  const result = await service.deletePaletteGroup(groupId)
  if (result.error) return { error: result.error }

  revalidatePalette(paletteId)
}
