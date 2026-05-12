'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { findPaintMatches } from '@/modules/paints/actions/find-paint-matches'
import { buildCompareUrl } from '@/modules/paints/utils/build-compare-url'

/** Default number of matches seeded into the `/compare` page. */
const DEFAULT_SIMILAR_LIMIT = 5

/**
 * Return shape of {@link useFindSimilarPaints}.
 *
 * @property findAndNavigate - Looks up the top-N matches for `paintId` and
 *   navigates to `/compare?paints=<paintId>,<match1>,...`. Resolves once
 *   the navigation has been issued.
 * @property isPending - `true` while the action is in flight.
 * @property error - The last error thrown by the action, or `null`.
 */
export type UseFindSimilarPaintsResult = {
  findAndNavigate: (paintId: string, limit?: number) => Promise<void>
  isPending: boolean
  error: Error | null
}

/**
 * Hook: looks up cross-brand matches for a source paint and navigates to
 * `/compare` seeded with the source plus its closest matches.
 *
 * Thin wrapper around the {@link findPaintMatches} server action that drives
 * a `useTransition` for pending state, surfaces errors as Sonner toasts,
 * and pushes the resulting URL via `next/navigation`.
 *
 * @returns A {@link UseFindSimilarPaintsResult}.
 */
export function useFindSimilarPaints(): UseFindSimilarPaintsResult {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<Error | null>(null)

  const findAndNavigate = useCallback(
    async (paintId: string, limit: number = DEFAULT_SIMILAR_LIMIT) => {
      setError(null)

      try {
        const matches = await findPaintMatches(paintId, { limit })
        const ids = [paintId, ...matches.map((m) => m.paint.id)]
        const url = buildCompareUrl(ids)

        startTransition(() => {
          router.push(url)
        })
      } catch (err) {
        const wrapped =
          err instanceof Error ? err : new Error('Failed to find similar paints')
        setError(wrapped)
        toast.error(wrapped.message)
      }
    },
    [router],
  )

  return { findAndNavigate, isPending, error }
}
