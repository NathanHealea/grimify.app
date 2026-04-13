import { createClient } from '@/lib/supabase/server'

import { createColorService } from '@/modules/colors/services/color-service'

/**
 * Creates a color service using the server-side Supabase client.
 *
 * @returns A color service instance bound to the server client.
 */
export async function getColorService() {
  const supabase = await createClient()
  return createColorService(supabase)
}
