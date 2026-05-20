'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'

/**
 * Server action that reorders the paint memberships within a single group.
 *
 * Accepts the complete ordered array of `palette_paints.id` values for the group
 * and delegates to `reorderGroupPaints`, which calls the
 * `reorder_palette_group_paints` RPC in a single transaction. The master list
 * and other groups are unaffected. Validates that the input is an exact
 * permutation of the group's current membership ids. Revalidates the palette
 * detail and owner edit paths on success.
 *
 * @param paletteId - UUID of the parent palette (used for ownership check and revalidation).
 * @param groupId - UUID of the group to reorder.
 * @param palettePaintIds - Stable `palette_paints.id` values in the desired order.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderGroupPaints(
  paletteId: string,
  groupId: string,
  palettePaintIds: string[],
): Promise<{ error?: string } | undefined> {
  if (!paletteId || !groupId || !Array.isArray(palettePaintIds)) {
    return { error: 'Invalid reorder request.' }
  }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service, palette } = auth

  const group = palette.groups.find((g) => g.id === groupId)
  if (!group) return { error: 'Group not found in palette.' }

  // Validate: input must be an exact permutation of the group's current membership ids.
  if (palettePaintIds.length !== group.paints.length) {
    return { error: 'Reorder list does not match group.' }
  }
  const expectedIds = new Set(group.paints.map((gp) => gp.palettePaintId))
  for (const id of palettePaintIds) {
    if (!expectedIds.has(id)) return { error: 'Reorder list does not match group.' }
  }

  const result = await service.reorderGroupPaints(groupId, palettePaintIds)
  if (result.error) return { error: result.error }

  revalidatePalette(paletteId)
}
