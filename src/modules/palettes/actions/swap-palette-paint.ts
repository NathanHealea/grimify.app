'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { normalizePalettePositions } from '@/modules/palettes/utils/normalize-palette-positions'

/**
 * Server action that replaces the paint in a single palette slot.
 *
 * Read-modify-write via `setPalettePaints` — clones the slot list, replaces
 * `paints[position].paintId`, preserves position and note, then atomically
 * persists via the `replace_palette_paints` RPC. Revalidates `/user/palettes`,
 * the public catalog, the palette detail page, and the owner edit page so card
 * swatches stay fresh.
 *
 * Swapping a slot with its current paint is a silent no-op (returns `undefined`
 * without touching the database).
 *
 * @param paletteId - UUID of the palette to modify.
 * @param position - 0-based slot index to replace.
 * @param newPaintId - UUID of the replacement paint.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function swapPalettePaint(
  paletteId: string,
  position: number,
  newPaintId: string,
): Promise<{ error: string } | undefined> {
  if (!paletteId || !newPaintId) return { error: 'Invalid palette or paint.' }
  if (!Number.isInteger(position) || position < 0) return { error: 'Invalid position.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to modify a palette.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only modify palettes you own.' }

  if (position >= palette.paints.length) return { error: 'Slot position is out of range.' }

  // No-op if the paint is unchanged
  if (palette.paints[position].paintId === newPaintId) return undefined

  const updated = palette.paints.map((slot, i) =>
    i === position
      ? { position: slot.position, paintId: newPaintId, note: slot.note ?? null }
      : { position: slot.position, paintId: slot.paintId, note: slot.note ?? null },
  )
  const normalized = normalizePalettePositions(updated)

  try {
    await service.setPalettePaints(paletteId, normalized)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to swap paint.'
    return { error: message }
  }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
