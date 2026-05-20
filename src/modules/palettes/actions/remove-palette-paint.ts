'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'

/**
 * Server action that removes a single paint from a palette's master list.
 *
 * Deletes the `palette_paints` row by its stable `id`. The FK cascade on
 * `palette_group_paints.palette_paint_id` removes every group membership for
 * this paint automatically. Remaining master-list positions are renumbered via
 * `reorder_palette_paints_v2`. Revalidates `/user/palettes`, the public catalog,
 * the palette detail page, and the owner edit page. Returns `{ error }` on any
 * failure; no redirect.
 *
 * @param paletteId - UUID of the palette to modify.
 * @param palettePaintId - Stable UUID of the master-list entry to remove.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function removePalettePaint(
  paletteId: string,
  palettePaintId: string,
): Promise<{ error: string } | undefined> {
  if (!paletteId || !palettePaintId) return { error: 'Invalid palette or paint.' }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service } = auth

  const result = await service.removePalettePaint(paletteId, palettePaintId)
  if (result.error) return { error: result.error }

  revalidatePalette(paletteId)
}
