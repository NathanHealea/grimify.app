'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'

/**
 * Server action that adds a master-list paint to a named group.
 *
 * Creates a new `palette_group_paints` membership row at the end of the group.
 * The same paint may belong to multiple groups simultaneously. The operation is
 * idempotent — adding a paint that is already a member of the group is silently
 * ignored. Callers are responsible for refreshing server-component data (e.g. via
 * `router.refresh()` inside a transition) so the UI updates without a flash.
 *
 * @param paletteId - UUID of the parent palette (used for ownership check and revalidation).
 * @param groupId - UUID of the target group.
 * @param palettePaintId - Stable UUID of the master-list entry to add.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function addPaintToGroup(
  paletteId: string,
  groupId: string,
  palettePaintId: string,
): Promise<{ error?: string } | undefined> {
  if (!paletteId || !groupId || !palettePaintId) {
    return { error: 'Invalid palette, group, or paint.' }
  }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { error: auth.error }
  const { service } = auth

  const result = await service.addPaintToGroup(groupId, palettePaintId)
  if (result.error) return { error: result.error }
}
