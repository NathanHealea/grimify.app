'use server'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { resolvePrincipalHueId } from '@/modules/palettes/utils/resolve-principal-hue-id'
import type { ActionResult } from '@/modules/palettes/types/action-result'

/**
 * Successful payload returned by {@link getHueSwapCandidates}.
 *
 * - `candidates` — all paints in the same hue group as the slot being swapped.
 * - `ownedIds` — paint ids in the user's collection; wrap in `Set` for O(1) lookup.
 * - `hueGroupName` — display name of the hue group (e.g. "Reds").
 */
export type HueSwapCandidatesResult = {
  candidates: ColorWheelPaint[]
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
 * @returns {@link ActionResult} with {@link HueSwapCandidatesResult} on success; `ok: false` with an error message on failure.
 */
export async function getHueSwapCandidates(input: {
  paletteId: string
  palettePaintId: string
}): Promise<ActionResult<HueSwapCandidatesResult>> {
  const { paletteId, palettePaintId } = input

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { user, palette } = auth

  const slot = palette.paints.find((p) => p.id === palettePaintId)
  if (!slot) return { ok: false, error: 'Slot not found.' }

  const paint = slot.paint
  if (!paint) return { ok: false, error: 'Paint data is missing for this slot.' }
  if (!paint.hue_id) return { ok: false, error: 'This paint has no hue assigned and cannot be swapped by hue.' }

  const hueService = await getHueService()
  const principalHueId = await resolvePrincipalHueId(hueService, paint.hue_id)
  if (!principalHueId) return { ok: false, error: 'Could not resolve hue group.' }

  const principalHue = await hueService.getHueById(principalHueId)
  if (!principalHue) return { ok: false, error: 'Hue group not found.' }

  const paintService = await getPaintService()
  const candidates = await paintService.listColorWheelPaintsByHueGroup(principalHueId)

  const collectionService = await getCollectionService()
  const ownedSet = await collectionService.getUserPaintIds(user.id)

  return {
    ok: true,
    data: {
      candidates,
      ownedIds: Array.from(ownedSet),
      hueGroupName: principalHue.name,
    },
  }
}
