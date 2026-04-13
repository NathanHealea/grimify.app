import { createClient } from '@/lib/supabase/client'

import { createPaintService } from '@/modules/paints/services/paint-service'

/**
 * Creates a paint service using the browser-side Supabase client.
 *
 * @returns A paint service instance bound to the browser client.
 */
export function getPaintService() {
  return createPaintService(createClient())
}
