'use client'

import { useEffect, useState } from 'react'

/**
 * Debounces a text input for use as a search query.
 *
 * Returns an empty string when `input.length` is between 1 and `minChars - 1`
 * so that a search is never fired for partial input below the minimum length.
 * A fully empty input (length 0) immediately clears the debounced value.
 *
 * @param input - The raw text input value.
 * @param options.delay - Debounce delay in milliseconds.
 * @param options.minChars - Minimum character count before a non-empty value is emitted.
 * @returns The debounced query string, or `''` if input is below `minChars`.
 */
export function useDebouncedQuery(
  input: string,
  options: { delay: number; minChars: number }
): string {
  const { delay, minChars } = options
  const [debounced, setDebounced] = useState(input)

  useEffect(() => {
    if (input.length > 0 && input.length < minChars) return
    const timer = setTimeout(() => setDebounced(input), delay)
    return () => clearTimeout(timer)
  }, [input, delay, minChars])

  return debounced
}
