'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to reorder a palette.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) return { error: 'You can only modify palettes you own.' }

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

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
