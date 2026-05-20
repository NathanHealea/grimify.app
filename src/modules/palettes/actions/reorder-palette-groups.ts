'use server'

import { revalidatePath } from 'next/cache'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'

/**
 * Server action that persists a new group order for a palette.
 *
 * Accepts the full ordered list of `{ id, position }` entries and batch-updates
 * each group's `position` via {@link reorderPaletteGroups}. Revalidates the
 * palette detail and edit paths on success.
 *
 * @param paletteId - UUID of the palette whose groups are being reordered.
 * @param ordered - Complete ordered list with new `position` values (0-based).
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderPaletteGroups(
  paletteId: string,
  ordered: Array<{ id: string; position: number }>,
): Promise<{ error?: string } | undefined> {
  if (!paletteId || !Array.isArray(ordered)) {
    return { error: 'Invalid reorder request.' }
  }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service } = auth

  const result = await service.reorderPaletteGroups(paletteId, ordered)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
