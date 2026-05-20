'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import { validateGroupName } from '@/modules/palettes/validation'
import type { VoidResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that renames an existing palette group.
 *
 * Takes `paletteId` to run the standard ownership check without a reverse
 * lookup from `groupId`. Validates the new name, then persists via
 * {@link updatePaletteGroup}. Revalidates the palette detail and edit paths on
 * success.
 *
 * @param paletteId - UUID of the parent palette (used for ownership check).
 * @param groupId - UUID of the group to update.
 * @param name - New display name (1–100 characters).
 * @returns {@link VoidResult} — `ok: true` on success; `ok: false` with an error message on failure.
 */
export async function updatePaletteGroup(
  paletteId: string,
  groupId: string,
  name: string,
): Promise<VoidResult> {
  const nameError = validateGroupName(name)
  if (nameError) return { ok: false, error: nameError }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { service } = auth

  const result = await service.updatePaletteGroup(groupId, { name: name.trim() })
  if (result.error) return { ok: false, error: result.error }

  revalidatePalette(paletteId)
  return { ok: true }
}
