'use client'

import { useRouter } from 'next/navigation'
import { type ChangeEvent, type SubmitEvent, useState } from 'react'

import SearchInput from '@/components/search'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * Hero search island. Wraps the shared {@link SearchInput} in a `<form>` and
 * navigates to `/paints?q={query}` on submit. An empty submission lands on
 * `/paints` (the full list).
 *
 * @remarks `SearchInput` manages its own internal state, so this component
 *   mirrors the value via `onChange` to drive the router push.
 */
export function HeroSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value)
  }

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = q.trim()
    router.push(trimmed ? `/paints?q=${encodeURIComponent(trimmed)}` : '/paints')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
      <Label htmlFor="hero-search" className="sr-only">
        Search paints
      </Label>
      <div className="flex-1">
        <SearchInput
          id="hero-search"
          name="q"
          placeholder="Search by paint name, brand, or hex (e.g. Mephiston Red, #8b1a1a)"
          autoComplete="off"
          onChange={handleChange}
        />
      </div>
      <Button type="submit" className="btn-lg sm:w-auto">
        Search paints
      </Button>
    </form>
  )
}
