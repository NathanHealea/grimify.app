import { createClient } from '@/lib/supabase/server'

import { createArmyService } from '@/modules/armies/services/army-service'

/**
 * Creates an army service using the server-side Supabase client.
 *
 * @returns An {@link ArmyService} instance bound to the server client.
 */
export async function getArmyService() {
  const supabase = await createClient()
  return createArmyService(supabase)
}
