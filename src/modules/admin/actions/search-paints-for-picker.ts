'use server'

import { createClient } from '@/lib/supabase/server'
import { createPaintService } from '@/modules/paints/services/paint-service'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Server action that searches paints by name or hex for the admin paint picker.
 *
 * Returns up to 20 results. Used by {@link AdminAddPaintForm} to power the
 * searchable paint-picker input.
 *
 * @param query - Search string. Prefix with `#` to match hex codes.
 * @returns `{ paints: PaintWithBrand[] }` on success, `{ error: string }` on failure.
 */
export async function searchPaintsForPicker(
  query: string
): Promise<{ paints: PaintWithBrand[] } | { error: string }> {
  if (!query.trim()) return { paints: [] }

  const supabase = await createClient()
  const service = createPaintService(supabase)

  const { paints } = await service.searchPaints({ query, limit: 20 })
  return { paints }
}
