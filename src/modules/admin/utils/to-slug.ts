/**
 * Converts a raw string into a URL-safe slug.
 *
 * Trims whitespace, lowercases, replaces spaces with hyphens, and removes
 * any character that is not `[a-z0-9-]`.
 *
 * @param value - The raw input string (e.g., a brand or paint name).
 * @returns A lowercase, hyphenated slug string.
 */
export function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
