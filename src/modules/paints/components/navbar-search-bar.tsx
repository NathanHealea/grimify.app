'use client'

import { useRouter } from 'next/navigation'
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
 * @param className - Optional class forwarded to the wrapping `<form>` element.
 */
export function NavbarSearchBar({ className }: { className?: string }) {
  const router = useRouter()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
    router.push(q ? `/paints?q=${encodeURIComponent(q)}` : '/paints')
  }

  return (
    <form onSubmit={handleSubmit} className={cn(className)}>
      <SearchInput name="q" placeholder="Search paints..." />
    </form>
  )
}
