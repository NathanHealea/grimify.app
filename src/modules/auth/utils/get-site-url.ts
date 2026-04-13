/**
 * Resolves the application's base URL for server-side use.
 *
 * Priority:
 * 1. `VERCEL_URL` — Vercel preview/production deployments.
 * 2. `NEXT_PUBLIC_SITE_URL` — explicit custom domain override.
 * 3. `http://localhost:3000` — local development fallback.
 */
export function getSiteUrl() {
  // Vercel preview deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // Production or custom domain
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  // Fallback to request origin
  return 'http://localhost:3000'
}
