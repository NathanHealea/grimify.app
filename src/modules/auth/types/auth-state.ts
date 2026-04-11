/**
 * Server action return state for authentication forms.
 *
 * - `error` — a general error message (e.g. invalid credentials).
 * - `success` — a success message (e.g. email confirmation sent).
 * - `null` — initial state before any submission.
 */
export type AuthState = { error?: string; success?: string } | null
