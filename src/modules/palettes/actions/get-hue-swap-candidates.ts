'use server'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { createClient } from '@/lib/supabase/server'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { resolvePrincipalHueId } from '@/modules/palettes/utils/resolve-principal-hue-id'

/** Successful result from {@link getHueSwapCandidates}. */
type HueSwapCandidatesResult = {
  candidates: ColorWheelPaint[]
  /** Paint ids in the user's collection; client wraps in `Set` for O(1) lookup. */
  ownedIds: string[]
  hueGroupName: string
}

/**
 * Server action that loads same-hue paint candidates for the hue-swap dialog.
 *
 * Resolves the source paint's principal hue group, fetches all paints in that
 * group, and returns the user's owned paint ids for the "Owned only" filter.
 *
 * @param input.paletteId - UUID of the palette containing the slot to swap.
 * @param input.position - 0-based slot index.
 * @returns Candidates + owned ids + hue group name on success; `{ error }` on failure.
 */
export async function getHueSwapCandidates(input: {
  paletteId: string
  position: number
}): Promise<{ error: string } | HueSwapCandidatesResult> {
  const { paletteId, position } = input

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to use the swap feature.' }

  const paletteService = createPaletteService(supabase)
  const palette = await paletteService.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only swap paints in palettes you own.' }

  const slot = palette.paints[position]
  if (!slot) return { error: 'Slot not found at that position.' }

  const paint = slot.paint
  if (!paint) return { error: 'Paint data is missing for this slot.' }
  if (!paint.hue_id) return { error: 'This paint has no hue assigned and cannot be swapped by hue.' }

  const hueService = await getHueService()
  const principalHueId = await resolvePrincipalHueId(hueService, paint.hue_id)
  if (!principalHueId) return { error: 'Could not resolve hue group.' }

  const principalHue = await hueService.getHueById(principalHueId)
  if (!principalHue) return { error: 'Hue group not found.' }

  const paintService = await getPaintService()
  const candidates = await paintService.listColorWheelPaintsByHueGroup(principalHueId)

  const collectionService = await getCollectionService()
  const ownedSet = await collectionService.getUserPaintIds(user.id)

  return {
    candidates,
    ownedIds: Array.from(ownedSet),
    hueGroupName: principalHue.name,
  }
}
