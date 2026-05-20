'use server'

import type { User, SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import type { Palette } from '@/modules/palettes/types/palette'
import type { PaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Verifies the caller is signed in and owns the given palette.
 *
 * Combines authentication and ownership in a single guard so server actions
 * can early-return instead of duplicating the auth + fetch + ownership check
 * pattern inline. Returns the authenticated user, bound Supabase client,
 * resolved palette, and a ready-to-use palette service on success.
 *
 * @param paletteId - UUID of the palette to look up and verify ownership of.
 * @returns `{ ok: true, user, supabase, palette, service }` when the caller owns the palette;
 *          `{ ok: false, error }` when not authenticated or not the owner.
 */
export async function requirePaletteOwnership(paletteId: string): Promise<
  | { ok: true; user: User; supabase: SupabaseClient; palette: Palette; service: PaletteService }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'You must be signed in.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)

  if (!palette) return { ok: false, error: 'Palette not found.' }
  if (palette.userId !== user.id) return { ok: false, error: 'You do not own this palette.' }

  return { ok: true, user, supabase, palette, service }
}
