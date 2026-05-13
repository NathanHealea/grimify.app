'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

import { useTurnstileInternal } from '@/modules/auth/components/turnstile-provider'

/**
 * Subset of the Cloudflare Turnstile JS API surface this component uses.
 */
interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

interface TurnstileRenderOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  'response-field'?: boolean
  theme?: 'light' | 'dark' | 'auto'
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/**
 * Cloudflare Turnstile human-verification widget.
 *
 * Loads the Turnstile script and renders the widget into a container. The
 * resulting token is published to the surrounding {@link TurnstileProvider},
 * which exposes it to every form and OAuth button on the page so a single
 * solved challenge can authorize any of them.
 *
 * If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset the component renders nothing
 * so local development without a site key still works.
 *
 * @remarks
 * Tokens are single-use. Callers should invoke `reset()` from
 * {@link useTurnstile} after each submission so the next attempt gets a
 * fresh token.
 */
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const { setToken, resetRequest } = useTurnstileInternal()

  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current) return
    if (widgetIdRef.current || !window.turnstile) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: setToken,
      'error-callback': () => setToken(''),
      'expired-callback': () => setToken(''),
      'response-field': false,
    })

    const id = widgetIdRef.current
    return () => {
      if (id && window.turnstile) {
        window.turnstile.remove(id)
      }
      widgetIdRef.current = null
    }
  }, [ready, siteKey, setToken])

  useEffect(() => {
    if (resetRequest === 0) return
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [resetRequest])

  if (!siteKey) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} />
    </>
  )
}
