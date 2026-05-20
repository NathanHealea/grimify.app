'use server'

import { revalidatePath } from 'next/cache'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'

/**
 * Server action that persists a new master-list order for a palette.
 *
 * Accepts the complete ordered array of stable `palette_paints.id` values and
 * delegates to `reorderMasterList`, which calls the `reorder_palette_paints_v2`
 * RPC in a single transaction. Group memberships are unaffected. Validates that
 * the input is an exact permutation of the current master-list ids. Revalidates
 * `/user/palettes`, the public catalog, the palette detail page, and the owner
 * edit page on success.
 *
 * @param paletteId - UUID of the palette to reorder.
 * @param palettePaintIds - Stable `palette_paints.id` values in the desired order.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderPalettePaints(
  paletteId: string,
  palettePaintIds: string[],
): Promise<{ error: string } | undefined> {
  if (!paletteId || !Array.isArray(palettePaintIds)) {
    return { error: 'Invalid reorder request.' }
  }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service, palette } = auth

  // Validate: input must be an exact permutation of the current master-list ids.
  if (palettePaintIds.length !== palette.paints.length) {
    return { error: 'Reorder list does not match palette.' }
  }
  const expectedIds = new Set(palette.paints.map((p) => p.id))
  for (const id of palettePaintIds) {
    if (!expectedIds.has(id)) return { error: 'Reorder list does not match palette.' }
  }

  const result = await service.reorderMasterList(paletteId, palettePaintIds)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
