'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import type { VoidResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that replaces the paint in a single master-list slot.
 *
 * Identifies the slot by its stable `palettePaintId` and updates `paint_id`
 * directly. Group memberships for the slot continue to reference the same
 * `palette_paint_id`, so they will reflect the new paint automatically.
 * Revalidates `/user/palettes`, the public catalog, the palette detail page, and
 * the owner edit page so card swatches stay fresh.
 *
 * Swapping a slot with its current paint is a silent no-op (returns `ok: true`
 * without touching the database).
 *
 * @param paletteId - UUID of the palette to modify.
 * @param palettePaintId - Stable UUID of the master-list entry to replace.
 * @param newPaintId - UUID of the replacement paint.
 * @returns {@link VoidResult} — `ok: true` on success; `ok: false` with an error message on failure.
 */
export async function swapPalettePaint(
  paletteId: string,
  palettePaintId: string,
  newPaintId: string,
): Promise<VoidResult> {
  if (!paletteId || !palettePaintId || !newPaintId) return { ok: false, error: 'Invalid palette or paint.' }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, palette } = auth

  const slot = palette.paints.find((p) => p.id === palettePaintId)
  if (!slot) return { ok: false, error: 'Slot not found in palette.' }

  // No-op if the paint is unchanged.
  if (slot.paintId === newPaintId) return { ok: true }

  const { error } = await supabase
    .from('palette_paints')
    .update({ paint_id: newPaintId })
    .eq('id', palettePaintId)
    .eq('palette_id', paletteId)

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'This paint is already in the palette.' }
    return { ok: false, error: error.message }
  }

  revalidatePalette(paletteId)
  return { ok: true }
}
