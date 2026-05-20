import { revalidatePath } from 'next/cache'

/**
 * Revalidates all Next.js cache paths affected by a palette mutation.
 *
 * Covers the owner dashboard (`/user/palettes`), the public catalog
 * (`/palettes`), the palette detail page, and the owner edit page. Call this
 * after any write that should be reflected in server-rendered views.
 *
 * @param paletteId - UUID of the palette that was mutated.
 */
export function revalidatePalette(paletteId: string): void {
  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}
