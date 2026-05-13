/**
 * Resolves the application's base URL for server-side use.
 *
 * Priority:
 * 1. `NEXT_PUBLIC_SITE_URL` — canonical production / custom domain.
 * 2. `VERCEL_URL` — Vercel deployment URL (preview deploys without an explicit site URL).
 * 3. `http://localhost:3000` — local development fallback.
 *
 * @remarks
 * `NEXT_PUBLIC_SITE_URL` takes priority over `VERCEL_URL` because the latter
 * is the deployment-specific hostname (e.g. `grimify-abc123.vercel.app`), not
 * the canonical production domain. OAuth redirects, PKCE cookies, and any
 * other origin-bound state must use the same host the user is browsing on.
 */
export function getSiteUrl() {
  // Canonical production or custom domain
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  // Vercel preview deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // Local development fallback
  return 'http://localhost:3000'
}
