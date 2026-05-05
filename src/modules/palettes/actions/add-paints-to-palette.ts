'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that appends an ordered list of paints to an existing palette.
 *
 * Performs auth and ownership checks before delegating to
 * {@link appendPaintsToPalette}. Revalidates the palette list and both palette
 * detail pages on success. Reserved for the deferred multi-select grid path;
 * the scheme save flow uses {@link createPaletteWithPaints} instead.
 *
 * @param paletteId - UUID of the target palette.
 * @param paintIds - Ordered list of paint UUIDs to append.
 * @returns `{ ok: true }` on success; `{ error }` on failure.
 */
export async function addPaintsToPalette(
  paletteId: string,
  paintIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to add paints to a palette.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only add paints to palettes you own.' }

  const result = await service.appendPaintsToPalette(paletteId, paintIds)
  if (result.error) return { error: result.error }

  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/palettes/${paletteId}/edit`)

  return { ok: true }
}
