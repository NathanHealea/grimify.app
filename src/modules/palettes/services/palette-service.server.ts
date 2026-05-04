import { createClient } from '@/lib/supabase/server'

import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Creates a palette service using the server-side Supabase client.
 *
 * Use in route loaders and server actions.
 *
 * @returns A {@link PaletteService} instance bound to the server client.
 */
export async function getPaletteService() {
  const supabase = await createClient()
  return createPaletteService(supabase)
}
