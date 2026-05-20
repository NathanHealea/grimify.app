/**
 * Machine-readable error codes for {@link ActionResult} failures.
 *
 * - `'duplicate'` — the resource already exists (e.g. paint already in palette)
 * - `'auth'` — caller is not signed in
 * - `'not_found'` — the target resource does not exist
 * - `'forbidden'` — caller is authenticated but does not own the resource
 * - `'unknown'` — any other failure (RPC, network, etc.)
 */
export type ErrorCode = 'duplicate' | 'auth' | 'not_found' | 'forbidden' | 'unknown'

/**
 * A typed action result that carries success data or a structured error.
 *
 * Discriminated by `ok`. On success, `data` holds the return value of type
 * `T`. On failure, `error` carries a human-readable message and `code` an
 * optional {@link ErrorCode} for programmatic handling.
 *
 * @typeParam T - The type of the success payload.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ErrorCode }

/**
 * A void action result for server actions that succeed without returning data.
 *
 * Discriminated by `ok`. Prefer over `Promise<{ error?: string } | undefined>`
 * so TypeScript narrows correctly at the callsite.
 */
export type VoidResult = { ok: true } | { ok: false; error: string }
