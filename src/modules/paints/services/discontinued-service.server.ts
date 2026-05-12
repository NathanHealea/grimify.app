import { createClient } from '@/lib/supabase/server'

import { createDiscontinuedService } from '@/modules/paints/services/discontinued-service'

/**
 * Creates a discontinued-paint service bound to the server Supabase client.
 *
 * @returns A discontinued-paint service instance for use in Server
 *   Components and route handlers.
 */
export async function getDiscontinuedService() {
  const supabase = await createClient()
  return createDiscontinuedService(supabase)
}
