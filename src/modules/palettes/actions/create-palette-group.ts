'use server'

import { requirePaletteOwnership } from '@/modules/palettes/utils/require-palette-ownership'
import { revalidatePalette } from '@/modules/palettes/utils/revalidate-palette'
import { validateGroupName } from '@/modules/palettes/validation'
import type { VoidResult } from '@/modules/palettes/types/action-result'

/**
 * Server action that creates a new named group within a palette.
 *
 * Validates the group name, checks ownership, then inserts via
 * {@link createPaletteGroup}. Revalidates the palette detail and edit paths on
 * success.
 *
 * @param paletteId - UUID of the palette that will own the group.
 * @param name - Display name for the new group (1–100 characters).
 * @returns {@link VoidResult} — `ok: true` on success; `ok: false` with an error message on failure.
 */
export async function createPaletteGroup(
  paletteId: string,
  name: string,
): Promise<VoidResult> {
  const nameError = validateGroupName(name)
  if (nameError) return { ok: false, error: nameError }

  const auth = await requirePaletteOwnership(paletteId)
  if (!auth.ok) return { ok: false, error: auth.error }
  const { service } = auth

  const result = await service.createPaletteGroup(paletteId, name.trim())
  if (result.error) return { ok: false, error: result.error }

  revalidatePalette(paletteId)
  return { ok: true }
}
