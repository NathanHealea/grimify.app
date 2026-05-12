'use client'

import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useFindSimilarPaints } from '@/modules/paints/hooks/use-find-similar-paints'

/**
 * Default number of cross-brand matches to seed into the `/compare` view.
 *
 * Combined with the source paint, this stays under the
 * `MAX_COMPARE_PAINTS = 6` cap (1 source + 5 matches = 6).
 */
const DEFAULT_SIMILAR_LIMIT = 5

/**
 * "Find similar paints" button shown on `PaintDetail`.
 *
 * Thin renderer over {@link useFindSimilarPaints}. On click, the hook
 * fetches the top-N cross-brand matches for the given paint and
 * navigates to `/compare?paints=<sourceId>,<match1>,...`.
 *
 * @param props.paintId - The source paint's UUID.
 * @param props.limit - Number of matches to seed; defaults to
 *   {@link DEFAULT_SIMILAR_LIMIT}.
 */
export function FindSimilarButton({
  paintId,
  limit = DEFAULT_SIMILAR_LIMIT,
}: {
  paintId: string
  limit?: number
}) {
  const { findAndNavigate, isPending } = useFindSimilarPaints()

  return (
    <Button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={() => findAndNavigate(paintId, limit)}
      disabled={isPending}
      aria-label="Find similar paints across brands"
    >
      <Sparkles className="size-4" aria-hidden="true" />
      {isPending ? 'Finding…' : 'Find similar'}
    </Button>
  )
}
