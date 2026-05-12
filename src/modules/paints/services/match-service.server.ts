import { createClient } from '@/lib/supabase/server'
import { createMatchService } from '@/modules/paints/services/match-service'

/**
 * Creates a match service using the server-side Supabase client.
 *
 * Mirrors {@link getPaintService} in `paint-service.server.ts`. The match
 * engine runs server-side so the catalog never reaches the browser via this
 * code path; server actions in `actions/find-paint-matches.ts` and
 * `actions/find-matches-for-paints.ts` are the only public entry points.
 *
 * @returns A match service instance bound to the server client.
 */
export async function getMatchService() {
  const supabase = await createClient()
  return createMatchService(supabase)
}
