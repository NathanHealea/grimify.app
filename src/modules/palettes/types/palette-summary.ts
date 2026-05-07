/**
 * Lightweight palette row used in browse and list views.
 *
 * Returned by `listPalettesForUser` and `listPublicPalettes`. Avoids loading
 * full paint data — only the first eight hex codes are included for swatch
 * previews.
 */
export type PaletteSummary = {
  /** UUID primary key. */
  id: string
  /** Display name of the palette. */
  name: string
  /** Whether the palette is publicly visible. */
  isPublic: boolean
  /** Total number of paint slots in the palette. */
  paintCount: number
  /** Up to eight hex color codes for swatch preview (e.g. `["#a1b2c3", ...]`). */
  swatches: string[]
  /** ISO timestamp of last update; used for default sort order. */
  updatedAt: string
  /**
   * Owner's profile display name. Populated by `listPublicPalettes` so catalog
   * cards can credit the author; omitted (or `null`) on owner-scoped queries
   * where the viewer always owns the palette.
   */
  ownerDisplayName?: string | null
}
