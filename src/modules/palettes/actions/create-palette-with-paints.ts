'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { validatePaletteForm } from '@/modules/palettes/validation'

/**
 * Server action that creates a new palette and populates it with an ordered
 * list of paints in a single flow.
 *
 * Validates the name with {@link validatePaletteForm}, creates the palette,
 * then appends all `paintIds` via `appendPaintsToPalette`. If the paint append
 * fails the palette still exists (empty) and the user is redirected to the
 * editor to retry. Revalidates `/palettes` then redirects to the edit page
 * on success.
 *
 * @param input.name - Palette name (1–80 chars, required).
 * @param input.description - Optional description (max 1000 chars).
 * @param input.paintIds - Ordered list of paint UUIDs to pre-populate.
 * @returns `{ error }` on validation or auth failure; redirects on success.
 */
export async function createPaletteWithPaints(input: {
  name: string
  description?: string
  paintIds: string[]
}): Promise<{ error: string }> {
  const name = input.name.trim()
  const description = input.description?.trim() ?? ''

  const fieldErrors = validatePaletteForm({ name, description })
  if (Object.keys(fieldErrors).length > 0) {
    return { error: Object.values(fieldErrors)[0] ?? 'Validation failed.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to create a palette.' }

  const service = createPaletteService(supabase)

  let palette
  try {
    palette = await service.createPalette({
      userId: user.id,
      name,
      description: description || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create palette.'
    return { error: message }
  }

  // Dedupe defensively so callers like "Save scheme as palette" cannot seed
  // a brand-new palette with two of the same paint when scheme matches collide
  // (e.g. triadic/analogous slots resolving to the same nearest paint).
  const uniquePaintIds = Array.from(new Set(input.paintIds))
  if (uniquePaintIds.length > 0) {
    await service.appendPaintsToPalette(palette.id, uniquePaintIds)
    // If append fails, palette exists but is empty — redirect to editor to retry
  }

  revalidatePath('/palettes')
  redirect(`/palettes/${palette.id}/edit`)
}
