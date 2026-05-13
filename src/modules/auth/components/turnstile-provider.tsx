'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface TurnstileContextValue {
  /** Most recent Turnstile token, or empty string when the user has not yet solved the challenge. */
  token: string
  /** Internal — used by {@link TurnstileWidget} to publish the token from the Cloudflare callback. */
  setToken: (token: string) => void
  /** Monotonic counter incremented on every `reset()` call so {@link TurnstileWidget} can react. */
  resetRequest: number
  /** Clears the current token and asks the rendered widget to reset for a fresh challenge. */
  reset: () => void
}

const TurnstileContext = createContext<TurnstileContextValue | null>(null)

/**
 * Provider that shares a single Cloudflare Turnstile token between every
 * form and OAuth button rendered inside its subtree.
 *
 * Turnstile tokens are single-use, so an auth page can only have one widget
 * rendered at a time. This provider owns the token state and exposes
 * {@link useTurnstile} so the email form, OAuth buttons, and password reset
 * form can all consume the same token without each rendering their own widget.
 *
 * @param children - The auth page subtree that needs access to the token.
 */
export function TurnstileProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('')
  const [resetRequest, setResetRequest] = useState(0)

  const reset = useCallback(() => {
    setToken('')
    setResetRequest((n) => n + 1)
  }, [])

  return (
    <TurnstileContext.Provider value={{ token, setToken, resetRequest, reset }}>{children}</TurnstileContext.Provider>
  )
}

/**
 * Hook returning the current Turnstile token and a `reset()` function.
 *
 * Must be called from a descendant of {@link TurnstileProvider}.
 *
 * @returns An object with `token` (the latest Turnstile response, or `''` if
 * unsolved) and `reset` (clears the token and triggers a widget reset).
 */
export function useTurnstile() {
  const context = useContext(TurnstileContext)
  if (!context) {
    throw new Error('useTurnstile must be used within a TurnstileProvider')
  }
  return { token: context.token, reset: context.reset }
}

/**
 * Hook returning the internal context value used by {@link TurnstileWidget}
 * to publish the token and observe reset requests.
 *
 * @returns The full provider context including `setToken` and `resetRequest`.
 */
export function useTurnstileInternal() {
  const context = useContext(TurnstileContext)
  if (!context) {
    throw new Error('useTurnstileInternal must be used within a TurnstileProvider')
  }
  return context
}
