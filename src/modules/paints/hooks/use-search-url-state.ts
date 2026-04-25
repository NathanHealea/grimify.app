'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Per-key history strategy:
 * - `'replace'` — always uses `replaceState` (e.g. debounced text input).
 * - `'push'`    — uses `pushState` on committed changes so Back retraces them.
 */
type HistoryMode = 'replace' | 'push'

/**
 * Configuration for {@link useSearchUrlState}.
 *
 * @param keys - Maps each state key to its history strategy.
 * @param hydrate - Parses a `URLSearchParams` snapshot into state `T`.
 * @param serialize - Converts state `T` into `URLSearchParams` for the URL.
 * @param basePath - The pathname written to the URL (e.g. `'/paints'`).
 * @param initialState - Server-provided initial state. Pass this to avoid the
 *   SSR/client hydration mismatch that occurs when the initializer reads
 *   `window.location.search` (only available on the client).
 */
type SearchUrlStateConfig<T extends Record<string, unknown>> = {
  keys: { [K in keyof T]: HistoryMode }
  hydrate: (sp: URLSearchParams) => T
  serialize: (state: T) => URLSearchParams
  basePath: string
  initialState?: T
}

/**
 * Two-way sync between search state and the browser URL.
 *
 * Uses `window.history` directly (not `router.replace`) to avoid triggering
 * server-component re-renders that would cause an infinite effect loop.
 *
 * History strategy (hybrid):
 * - `update(patch, { commit: false })` always calls `replaceState`. Use this
 *   for debounce-fired query ticks so keystrokes don't flood the history stack.
 * - `update(patch, { commit: true })` calls `pushState` if any field tagged
 *   `'push'` in `keys` changed; otherwise falls back to `replaceState`. Use
 *   this for filter, page, and size changes so Back retraces them.
 *
 * Re-hydrates on `popstate` so Back / Forward restore state correctly.
 *
 * @param config - See {@link SearchUrlStateConfig}.
 * @returns `state` and an `update` function for applying partial patches.
 */
export function useSearchUrlState<T extends Record<string, unknown>>(
  config: SearchUrlStateConfig<T>
): {
  state: T
  update: (patch: Partial<T>, options?: { commit?: boolean }) => void
} {
  const { keys, hydrate, serialize, basePath, initialState } = config

  const [state, setState] = useState<T>(
    initialState ?? hydrate(new URLSearchParams())
  )

  // Always reflects latest committed state without closing over a stale value.
  const stateRef = useRef(state)
  stateRef.current = state

  // Re-hydrate when the user navigates Back / Forward
  useEffect(() => {
    function onPopState() {
      setState(hydrate(new URLSearchParams(window.location.search)))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [hydrate])

  const update = useCallback(
    (patch: Partial<T>, options?: { commit?: boolean }) => {
      const commit = options?.commit ?? false
      const prev = stateRef.current
      const next = { ...prev, ...patch }

      const sp = serialize(next)
      const qs = sp.toString()
      const url = qs ? `${basePath}?${qs}` : basePath

      // Use pushState if committing AND any push-keyed field changed
      const shouldPush =
        commit &&
        (Object.keys(patch) as (keyof T)[]).some(
          (k) => keys[k] === 'push' && patch[k] !== prev[k]
        )

      // Write URL before setState so history is consistent with the new state.
      // Must NOT be called inside a setState updater — that runs during React
      // render and would trigger a Router update mid-render.
      if (shouldPush) {
        window.history.pushState(null, '', url)
      } else {
        window.history.replaceState(null, '', url)
      }

      setState(next)
    },
    [keys, serialize, basePath]
  )

  return { state, update }
}
