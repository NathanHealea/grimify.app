'use client'

import Script from 'next/script'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'

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
 * Imperative handle exposed by {@link TurnstileWidget} so parent forms can
 * reset the challenge after a submission (Turnstile tokens are single-use).
 */
export interface TurnstileWidgetHandle {
  reset: () => void
}

interface TurnstileWidgetProps {
  ref?: Ref<TurnstileWidgetHandle>
}

/**
 * Cloudflare Turnstile human-verification widget.
 *
 * Loads the Turnstile script, renders the widget into a container, and
 * exposes the resulting token through a hidden form field named
 * `cf-turnstile-response`. If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset the
 * component renders nothing so local development without a site key still
 * works; server-side verification handles the matching secret-key case.
 *
 * @remarks
 * Tokens are single-use. Parent forms should call `reset()` on the ref after
 * each submission so the next attempt receives a fresh token.
 */
export function TurnstileWidget({ ref }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
  const [ready, setReady] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        setToken('')
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
    }),
    [],
  )

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
  }, [ready, siteKey])

  if (!siteKey) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
    </>
  )
}
