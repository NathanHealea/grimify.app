'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import type { ActionResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that appends a single paint to an existing palette.
 *
 * Performs auth and ownership checks before delegating to
 * {@link appendPaintToPalette}. Revalidates `/user/palettes` (owner dashboard),
 * `/palettes` (public catalog), the palette detail page, and the owner edit
 * page on success. Returns the palette name so the caller can surface a
 * "Added '{paint}' to '{palette}'" toast.
 *
 * The result includes a `code` discriminator so callers can render a
 * duplicate-specific toast message without parsing the human-readable error.
 *
 * @param paletteId - UUID of the target palette.
 * @param paintId - UUID of the paint to append.
 * @returns {@link ActionResult} with `{ paletteName }` on success; `ok: false` with `error` and `code` on failure.
 */
export async function addPaintToPalette(
  paletteId: string,
  paintId: string,
): Promise<ActionResult<{ paletteName: string }>> {
  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error, code: 'forbidden' }
  const { service, palette } = auth

  const result = await service.appendPaintToPalette(paletteId, paintId)
  if (result.error) return { ok: false, error: result.error, code: result.code ?? 'unknown' }

  revalidatePalette(paletteId)

  return { ok: true, data: { paletteName: palette.name } }
}
