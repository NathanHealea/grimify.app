'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { FormEvent } from 'react'

import SearchInput from '@/components/search'
import { cn } from '@/lib/utils'

/**
 * Compact paint search form for the desktop navbar.
 *
 * Renders a search input that, on submit, navigates to `/paints?q=<value>`.
 * An empty submission navigates to `/paints` with no query param, clearing
 * any active search. Intended to be rendered only at the `lg` breakpoint and
 * above — the parent {@link Navbar} controls visibility.
 *
 * When already on `/paints`, updates the URL via `history.pushState` and
 * dispatches a synthetic `popstate` event so {@link useSearchUrlState}
 * re-hydrates without a full Next.js navigation (which doesn't fire `popstate`
 * and therefore wouldn't update the explorer's search state).
 *
 * @param className - Optional class forwarded to the wrapping `<form>` element.
 */
export function NavbarSearchBar({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
    const url = q ? `/paints?q=${encodeURIComponent(q)}` : '/paints'

    if (pathname === '/paints') {
      window.history.pushState(null, '', url)
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    } else {
      router.push(url)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn(className)}>
      <SearchInput name="q" placeholder="Search paints..." />
    </form>
  )
}
