/** localStorage key used to persist recently-viewed palette IDs. */
export const RECENTLY_VIEWED_KEY = 'grimify:recently-viewed-palettes'

/**
 * Reads the list of recently-viewed palette IDs from `localStorage`.
 *
 * Safe to call during SSR — returns `[]` when `window` is not defined.
 * Also returns `[]` on any parse or shape failure so callers never need to
 * handle exceptions.
 *
 * @returns Ordered array of palette UUIDs (most recent first), or `[]`.
 */
export function getRecentlyViewedPaletteIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

/**
 * Prepends a palette ID to the recently-viewed list, deduplicates, and
 * trims the list to at most 10 entries before persisting.
 *
 * No-op when called during SSR (`window` is not defined). Swallows
 * `localStorage.setItem` errors (e.g. storage quota exceeded in private
 * browsing) so a recording failure never breaks the palette detail page.
 *
 * @param id - The palette UUID to record as recently viewed.
 */
export function addRecentlyViewedPaletteId(id: string): void {
  if (typeof window === 'undefined') return
  const current = getRecentlyViewedPaletteIds().filter((v) => v !== id)
  const updated = [id, ...current].slice(0, 10)
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
  } catch {
    // quota exceeded or private browsing — non-critical, swallow silently
  }
}
