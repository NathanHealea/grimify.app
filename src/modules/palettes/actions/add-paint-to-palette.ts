'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Server action that appends a single paint to an existing palette.
 *
 * Performs auth and ownership checks before delegating to
 * {@link appendPaintToPalette}. Revalidates the palette list and both palette
 * detail pages on success. Returns the palette name so the caller can render
 * an inline "Added to {name}" confirmation without a redirect.
 *
 * @param paletteId - UUID of the target palette.
 * @param paintId - UUID of the paint to append.
 * @returns `{ ok: true, paletteName }` on success; `{ error }` on failure.
 */
export async function addPaintToPalette(
  paletteId: string,
  paintId: string,
): Promise<{ ok: true; paletteName: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to add paints to a palette.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only add paints to palettes you own.' }

  const result = await service.appendPaintToPalette(paletteId, paintId)
  if (result.error) return { error: result.error }

  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/palettes/${paletteId}/edit`)

  return { ok: true, paletteName: palette.name }
}
