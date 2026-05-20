'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import type { VoidResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that persists a new group order for a palette.
 *
 * Accepts the full ordered list of `{ id, position }` entries and batch-updates
 * each group's `position` via {@link reorderPaletteGroups}. Revalidates the
 * palette detail and edit paths on success.
 *
 * @param paletteId - UUID of the palette whose groups are being reordered.
 * @param ordered - Complete ordered list with new `position` values (0-based).
 * @returns {@link VoidResult} — `ok: true` on success; `ok: false` with an error message on failure.
 */
export async function reorderPaletteGroups(
  paletteId: string,
  ordered: Array<{ id: string; position: number }>,
): Promise<VoidResult> {
  if (!paletteId || !Array.isArray(ordered)) {
    return { ok: false, error: 'Invalid reorder request.' }
  }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { service } = auth

  const result = await service.reorderPaletteGroups(paletteId, ordered)
  if (result.error) return { ok: false, error: result.error }

  revalidatePalette(paletteId)
  return { ok: true }
}
