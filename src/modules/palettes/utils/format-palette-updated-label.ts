/**
 * Formats an ISO timestamp as a human-readable relative label.
 *
 * Returns "Updated just now" for changes within the last minute, a relative
 * phrase ("Updated 3 days ago") for changes within the last 30 days, or a
 * localized date string ("Updated on Jan 4") for older changes.
 *
 * @param isoTimestamp - ISO 8601 timestamp string (e.g. from `updatedAt`).
 * @returns A display label suitable for palette cards and headers.
 */
export function formatPaletteUpdatedLabel(isoTimestamp: string): string {
  const updated = new Date(isoTimestamp)
  const now = new Date()
  const diffMs = now.getTime() - updated.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'Updated just now'
  }

  if (diffDays < 30) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

    if (diffDays >= 1) {
      return `Updated ${rtf.format(-diffDays, 'day')}`
    }
    if (diffHours >= 1) {
      return `Updated ${rtf.format(-diffHours, 'hour')}`
    }
    return `Updated ${rtf.format(-diffMinutes, 'minute')}`
  }

  return `Updated on ${updated.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
}
