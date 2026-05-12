/**
 * Filters and limits for the cross-brand paint match engine.
 *
 * Each field is optional with the defaults documented inline. The engine is
 * cross-brand by default: discontinued paints, the source paint, and the
 * source paint's own brand are all dropped unless the caller opts back in.
 *
 * @remarks Used by {@link findMatchesForPaint} and {@link findMatchesForPaints}
 * in `match-service.ts`, and by the public server actions that wrap them.
 */
export type MatchOptions = {
  /** Drop discontinued paints from candidates. Default `true`. */
  excludeDiscontinued?: boolean
  /** Drop the source paint itself from results. Default `true`. */
  excludeSamePaint?: boolean
  /** Drop paints from the source paint's own brand. Default `true`. */
  excludeSameBrand?: boolean
  /** When set, restrict candidates to these brand IDs. */
  brandIds?: string[]
  /** Maximum number of matches to return. Default `10`, clamped to `[1, 50]`. */
  limit?: number
}
