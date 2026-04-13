import { createClient } from '@/lib/supabase/server'

import { createPaintService } from '@/modules/paints/services/paint-service'

/**
 * Creates a paint service using the server-side Supabase client.
 *
 * @returns A paint service instance bound to the server client.
 */
export async function getPaintService() {
  const supabase = await createClient()
  return createPaintService(supabase)
}
