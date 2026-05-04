import { createClient } from '@/lib/supabase/client'

import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Creates a palette service using the browser-side Supabase client.
 *
 * Use in client components when direct data access is needed without a
 * server action round-trip.
 *
 * @returns A {@link PaletteService} instance bound to the browser client.
 */
export function getPaletteService() {
  return createPaletteService(createClient())
}
