import { createClient } from '@/lib/supabase/server'

import { createBrandService } from '@/modules/brands/services/brand-service'

/**
 * Creates a brand service using the server-side Supabase client.
 *
 * @returns A brand service instance bound to the server client.
 */
export async function getBrandService() {
  const supabase = await createClient()
  return createBrandService(supabase)
}
