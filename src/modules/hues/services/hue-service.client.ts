import { createClient } from '@/lib/supabase/client'

import { createHueService } from '@/modules/hues/services/hue-service'

/**
 * Creates a hue service using the browser-side Supabase client.
 *
 * @returns A hue service instance bound to the browser client.
 */
export function getHueService() {
  return createHueService(createClient())
}
