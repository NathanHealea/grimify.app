'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import type { VoidResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that appends an ordered list of paints to an existing palette.
 *
 * Performs auth and ownership checks before delegating to
 * {@link appendPaintsToPalette}. Revalidates `/user/palettes` (owner
 * dashboard), `/palettes` (public catalog), the palette detail page, and the
 * owner edit page on success. Reserved for the deferred multi-select grid
 * path; the scheme save flow uses {@link createPaletteWithPaints} instead.
 *
 * @param paletteId - UUID of the target palette.
 * @param paintIds - Ordered list of paint UUIDs to append.
 * @returns {@link VoidResult} — `ok: true` on success; `ok: false` with an error message on failure.
 */
export async function addPaintsToPalette(
  paletteId: string,
  paintIds: string[],
): Promise<VoidResult> {
  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { service } = auth

  const result = await service.appendPaintsToPalette(paletteId, paintIds)
  if (result.error) return { ok: false, error: result.error }

  revalidatePalette(paletteId)

  return { ok: true }
}
