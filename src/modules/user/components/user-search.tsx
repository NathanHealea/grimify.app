'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input';

/**
 * Debounced search input that syncs query state to URL search params.
 *
 * Updates the `?q=` param with a 300ms debounce. Preserves the existing
 * `?role=` param and resets `?page=` to 1 whenever the query changes.
 *
 * @param props.initialValue - The current search query from the URL (`?q=`).
 */
export function UserSearch({ initialValue }: { initialValue: string }) {
  const router = useRouter()
  const [value, setValue] = useState(initialValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync to URL with debounce
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (value) {
        params.set('q', value)
      } else {
        params.delete('q')
      }
      // Reset to page 1 on new search
      params.delete('page')
      router.replace(`?${params.toString()}`)
    }, 300)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [value, router])

  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search by display name…"
      aria-label="Search users"
    />
  )
}
