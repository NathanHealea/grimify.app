'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import type { VoidResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that removes a paint's membership from a group.
 *
 * Deletes the `palette_group_paints` row for `(groupId, palettePaintId)`.
 * The master-list entry and any other group memberships for the same paint are
 * unaffected. Callers are responsible for refreshing server-component data (e.g. via
 * `router.refresh()` inside a transition) so the UI updates without a flash.
 *
 * @param paletteId - UUID of the parent palette (used for ownership check and revalidation).
 * @param groupId - UUID of the group to remove the paint from.
 * @param palettePaintId - Stable UUID of the master-list entry to remove from the group.
 * @returns {@link VoidResult} — `ok: true` on success; `ok: false` with an error message on failure.
 */
export async function removePaintFromGroup(
  paletteId: string,
  groupId: string,
  palettePaintId: string,
): Promise<VoidResult> {
  if (!paletteId || !groupId || !palettePaintId) {
    return { ok: false, error: 'Invalid palette, group, or paint.' }
  }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { service } = auth

  const result = await service.removePaintFromGroup(groupId, palettePaintId)
  if (result.error) return { ok: false, error: result.error }

  return { ok: true }
}
