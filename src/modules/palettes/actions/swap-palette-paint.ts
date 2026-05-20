'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'

/**
 * Server action that replaces the paint in a single master-list slot.
 *
 * Identifies the slot by its stable `palettePaintId` and updates `paint_id`
 * directly. Group memberships for the slot continue to reference the same
 * `palette_paint_id`, so they will reflect the new paint automatically.
 * Revalidates `/user/palettes`, the public catalog, the palette detail page, and
 * the owner edit page so card swatches stay fresh.
 *
 * Swapping a slot with its current paint is a silent no-op (returns `undefined`
 * without touching the database).
 *
 * @param paletteId - UUID of the palette to modify.
 * @param palettePaintId - Stable UUID of the master-list entry to replace.
 * @param newPaintId - UUID of the replacement paint.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function swapPalettePaint(
  paletteId: string,
  palettePaintId: string,
  newPaintId: string,
): Promise<{ error: string } | undefined> {
  if (!paletteId || !palettePaintId || !newPaintId) return { error: 'Invalid palette or paint.' }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { supabase, palette } = auth

  const slot = palette.paints.find((p) => p.id === palettePaintId)
  if (!slot) return { error: 'Slot not found in palette.' }

  // No-op if the paint is unchanged.
  if (slot.paintId === newPaintId) return undefined

  const { error } = await supabase
    .from('palette_paints')
    .update({ paint_id: newPaintId })
    .eq('id', palettePaintId)
    .eq('palette_id', paletteId)

  if (error) {
    if (error.code === '23505') return { error: 'This paint is already in the palette.' }
    return { error: error.message }
  }

  revalidatePalette(paletteId)
}
