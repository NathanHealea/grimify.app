import type { PaintSortDirection } from '@/modules/paints/utils/sort-paints'

/**
 * Parses and validates a `sort` URL param value.
 *
 * Falls back to `'name'` for any unrecognised or missing value so that stale
 * or hand-crafted URLs never produce an invalid sort field.
 *
 * Shared between `paint-explorer.tsx` and `src/app/paints/page.tsx` to prevent
 * SSR-client state mismatch on first paint. Lives in a plain utility file
 * (no `'use client'`) so it can be called from both server and client code.
 *
 * @param value - Raw string from `URLSearchParams.get('sort')` or a Next.js
 *   `searchParams` object.
 * @returns A validated {@link PaintSortField} value.
 */
export function parseSortField(value: string | null | undefined): 'name' | 'hue' | 'lightness' | 'contrast' {
  if (value === 'hue' || value === 'lightness' || value === 'contrast') return value
  return 'name'
}

/**
 * Parses and validates a `dir` URL param value.
 *
 * Falls back to `'asc'` for any unrecognised or missing value.
 *
 * Shared between `paint-explorer.tsx` and `src/app/paints/page.tsx`.
 *
 * @param value - Raw string from `URLSearchParams.get('dir')` or a Next.js
 *   `searchParams` object.
 * @returns A validated {@link PaintSortDirection} value.
 */
export function parseSortDir(value: string | null | undefined): PaintSortDirection {
  if (value === 'desc') return 'desc'
  return 'asc'
}
