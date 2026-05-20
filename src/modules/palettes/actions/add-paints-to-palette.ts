'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import type { AddPaintsToPaletteResult } from '@/modules/palettes/types/add-paint-to-palette-result'

/**
 * Server action that appends an ordered list of paints to an existing palette.
 *
 * Performs auth and ownership checks before delegating to
 * {@link appendPaintsToPalette}. Revalidates `/user/palettes` (owner
 * dashboard), `/palettes` (public catalog), the palette detail page, and the
 * owner edit page on success. Reserved for the deferred multi-select grid
 * path; the scheme save flow uses {@link createPaletteWithPaints} instead.
 *
 * Threads the service-layer `code` discriminator and `duplicateIds` array
 * through so callers can surface duplicate-specific feedback that names the
 * offending paints.
 *
 * @param paletteId - UUID of the target palette.
 * @param paintIds - Ordered list of paint UUIDs to append.
 * @returns An {@link AddPaintsToPaletteResult} discriminated by `error`.
 */
export async function addPaintsToPalette(
  paletteId: string,
  paintIds: string[],
): Promise<AddPaintsToPaletteResult> {
  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error, code: 'forbidden' }
  const { service } = auth

  const result = await service.appendPaintsToPalette(paletteId, paintIds)
  if (result.error) {
    return {
      error: result.error,
      code: result.code ?? 'unknown',
      ...(result.duplicateIds ? { duplicateIds: result.duplicateIds } : {}),
    }
  }

  revalidatePalette(paletteId)

  return { ok: true }
}
