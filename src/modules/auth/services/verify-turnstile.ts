import 'server-only'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Result of a Cloudflare Turnstile token verification.
 *
 * - `success: true` — the token verified, or verification was skipped
 *   because no secret key is configured in a non-production environment.
 * - `success: false` — verification failed; `error` carries a user-facing
 *   message suitable for surfacing in an auth form.
 */
export type TurnstileVerifyResult = { success: true } | { success: false; error: string }

/**
 * Verifies a Cloudflare Turnstile token against the siteverify endpoint.
 *
 * @param token - The `cf-turnstile-response` value submitted from the form.
 *
 * @returns A {@link TurnstileVerifyResult} indicating whether the challenge
 * passed. When `TURNSTILE_SECRET_KEY` is unset, verification is skipped in
 * non-production environments to keep local development frictionless, and
 * fails closed in production.
 *
 * @remarks
 * Tokens are single-use and expire ~5 minutes after issuance. Callers should
 * trigger a widget reset on the client after each submission.
 */
export async function verifyTurnstile(token: string | null): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'Human verification is unavailable. Please try again later.' }
    }
    return { success: true }
  }

  if (!token) {
    return { success: false, error: 'Please complete the human verification challenge.' }
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }).toString(),
    cache: 'no-store',
  })

  if (!response.ok) {
    return { success: false, error: 'Human verification failed. Please try again.' }
  }

  const data = (await response.json()) as { success: boolean }
  if (!data.success) {
    return { success: false, error: 'Human verification failed. Please try again.' }
  }

  return { success: true }
}
