'use server'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
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
 * @param input.palettePaintId - Stable UUID of the master-list entry to swap.
 * @returns Candidates + owned ids + hue group name on success; `{ error }` on failure.
 */
export async function getHueSwapCandidates(input: {
  paletteId: string
  palettePaintId: string
}): Promise<{ error: string } | HueSwapCandidatesResult> {
  const { paletteId, palettePaintId } = input

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { user, palette } = auth

  const slot = palette.paints.find((p) => p.id === palettePaintId)
  if (!slot) return { error: 'Slot not found.' }

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
