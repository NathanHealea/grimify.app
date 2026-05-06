'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import type { AddPaintsToPaletteResult } from '@/modules/palettes/types/add-paint-to-palette-result'

/**
 * Server action that appends an ordered list of paints to an existing palette.
 *
 * Performs auth and ownership checks before delegating to
 * {@link appendPaintsToPalette}. Revalidates the palette list and both palette
 * detail pages on success. Reserved for the deferred multi-select grid path;
 * the scheme save flow uses {@link createPaletteWithPaints} instead.
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

  const result = await service.appendPaintsToPalette(paletteId, paintIds)
  if (result.error) {
    return {
      error: result.error,
      code: result.code ?? 'unknown',
      ...(result.duplicateIds ? { duplicateIds: result.duplicateIds } : {}),
    }
  }

  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/palettes/${paletteId}/edit`)

  return { ok: true }
}
