'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import type { VoidResult } from '@/modules/palettes/types/action-result'

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
 * @returns {@link VoidResult} — `ok: true` on success; `ok: false` with an error message on failure.
 */
export async function reorderPalettePaints(
  paletteId: string,
  palettePaintIds: string[],
): Promise<VoidResult> {
  if (!paletteId || !Array.isArray(palettePaintIds)) {
    return { ok: false, error: 'Invalid reorder request.' }
  }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { service, palette } = auth

  // Validate: input must be an exact permutation of the current master-list ids.
  if (palettePaintIds.length !== palette.paints.length) {
    return { ok: false, error: 'Reorder list does not match palette.' }
  }
  const expectedIds = new Set(palette.paints.map((p) => p.id))
  for (const id of palettePaintIds) {
    if (!expectedIds.has(id)) return { ok: false, error: 'Reorder list does not match palette.' }
  }

  const result = await service.reorderMasterList(paletteId, palettePaintIds)
  if (result.error) return { ok: false, error: result.error }

  revalidatePalette(paletteId)
  return { ok: true }
}
