'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { normalizePalettePositions } from '@/modules/palettes/utils/normalize-palette-positions'

type ReorderInput = { paintId: string; note: string | null; groupId?: string | null }

/**
 * Server action that persists a new paint slot order for a palette.
 *
 * Accepts the full ordered list of `{ paintId, note }` slots and atomically
 * replaces all palette_paints rows via {@link setPalettePaints}. Validates
 * that the input is a permutation of the current slots (multiset check by
 * paintId count). Revalidates `/user/palettes`, the public catalog, the
 * palette detail page, and the owner edit page on success.
 *
 * @param paletteId - UUID of the palette to reorder.
 * @param ordered - The complete new slot list in the desired order.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderPalettePaints(
  paletteId: string,
  ordered: ReorderInput[],
): Promise<{ error: string } | undefined> {
  if (!paletteId || !Array.isArray(ordered)) {
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
  if (palette.userId !== user.id) {
    return { error: 'You can only reorder palettes you own.' }
  }

  // Multiset check: ordered must be a permutation of the current paint slots.
  // Compares by paintId count so the same paint may appear at multiple positions.
  if (ordered.length !== palette.paints.length) {
    return { error: 'Reorder list does not match palette.' }
  }
  const expected = new Map<string, number>()
  for (const slot of palette.paints) {
    expected.set(slot.paintId, (expected.get(slot.paintId) ?? 0) + 1)
  }
  for (const slot of ordered) {
    const remaining = (expected.get(slot.paintId) ?? 0) - 1
    if (remaining < 0) return { error: 'Reorder list does not match palette.' }
    expected.set(slot.paintId, remaining)
  }

  const normalized = normalizePalettePositions(
    ordered.map((slot, index) => ({
      position: index,
      paintId: slot.paintId,
      note: slot.note,
      groupId: slot.groupId ?? null,
    })),
  )

  const result = await service.setPalettePaints(paletteId, normalized)
  if (result.error) return { error: result.error }

  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
