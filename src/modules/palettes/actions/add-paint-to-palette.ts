'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import type { AddPaintToPaletteResult } from '@/modules/palettes/types/add-paint-to-palette-result'

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
 * @returns An {@link AddPaintToPaletteResult} discriminated by `error`.
 */
export async function addPaintToPalette(
  paletteId: string,
  paintId: string,
): Promise<AddPaintToPaletteResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to add paints to a palette.', code: 'auth' }
  }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.', code: 'not_found' }
  if (palette.userId !== user.id) {
    return { error: 'You can only add paints to palettes you own.', code: 'forbidden' }
  }

  const result = await service.appendPaintToPalette(paletteId, paintId)
  if (result.error) return { error: result.error, code: result.code ?? 'unknown' }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)

  return { ok: true, paletteName: palette.name }
}
