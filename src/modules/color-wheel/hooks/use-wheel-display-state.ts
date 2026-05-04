'use client'

import { useState } from 'react'

const BRAND_RING_KEY = 'wheel:showBrandRing'
const OWNED_RING_KEY = 'wheel:showOwnedRing'

function readBool(key: string): boolean {
  if (typeof window === 'undefined') return false
  try { return sessionStorage.getItem(key) === 'true' } catch { return false }
}

/**
 * Manages the boolean display toggles for the HSL color wheel dot decorations.
 *
 * Both values are persisted to `sessionStorage` so they survive page navigation
 * within a session but reset on a fresh tab. Falls back to `false` when storage
 * is unavailable (e.g. SSR or private-mode restrictions).
 *
 * @returns `showBrandRing`, `showOwnedRing`, and their respective setters.
 */
export function useWheelDisplayState() {
  const [showBrandRing, setShowBrandRingState] = useState(() => readBool(BRAND_RING_KEY))
  const [showOwnedRing, setShowOwnedRingState] = useState(() => readBool(OWNED_RING_KEY))

  function setShowBrandRing(value: boolean) {
    setShowBrandRingState(value)
    try { sessionStorage.setItem(BRAND_RING_KEY, String(value)) } catch { /* ignore */ }
  }

  function setShowOwnedRing(value: boolean) {
    setShowOwnedRingState(value)
    try { sessionStorage.setItem(OWNED_RING_KEY, String(value)) } catch { /* ignore */ }
  }

  return { showBrandRing, showOwnedRing, setShowBrandRing, setShowOwnedRing }
}
