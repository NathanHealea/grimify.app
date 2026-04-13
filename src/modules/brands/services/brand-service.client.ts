import { createClient } from '@/lib/supabase/client'

import { createBrandService } from '@/modules/brands/services/brand-service'

/**
 * Creates a brand service using the browser-side Supabase client.
 *
 * @returns A brand service instance bound to the browser client.
 */
export function getBrandService() {
  return createBrandService(createClient())
}
