/**
 * Resolves the canonical site origin (scheme + host) used as `metadataBase`
 * and to build absolute URLs for sitemaps and OpenGraph image references.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_SITE_URL` — explicit override (e.g. `https://grimify.app`).
 * 2. `VERCEL_URL` — set automatically on Vercel deployments (host only, no scheme).
 * 3. `http://localhost:3000` — local development fallback.
 *
 * @returns Absolute origin including scheme; never has a trailing slash.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return stripTrailingSlash(explicit)

  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${stripTrailingSlash(vercel)}`

  return 'http://localhost:3000'
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}
