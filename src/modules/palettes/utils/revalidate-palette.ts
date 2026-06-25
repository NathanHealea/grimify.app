import { revalidatePath } from 'next/cache'

/**
 * Revalidates the palette list paths: `/user/palettes` and `/palettes`.
 *
 * Call after any write that affects which palettes appear in the owner
 * dashboard or public catalog (create, delete).
 */
export function revalidatePaletteList(): void {
  revalidatePath('/user/palettes')
  revalidatePath('/palettes')
}

/**
 * Revalidates the palette detail paths: `/palettes/{id}` and the owner edit
 * page `/user/palettes/{id}/edit`.
 *
 * Call after any write that affects a specific palette's content.
 *
 * @param paletteId - UUID of the palette that was mutated.
 */
export function revalidatePaletteDetail(paletteId: string): void {
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/user/palettes/${paletteId}/edit`)
}

/**
 * Revalidates all Next.js cache paths affected by a palette mutation.
 *
 * Convenience wrapper: calls {@link revalidatePaletteList} and
 * {@link revalidatePaletteDetail}. Covers the owner dashboard
 * (`/user/palettes`), the public catalog (`/palettes`), the palette detail
 * page, and the owner edit page.
 *
 * @param paletteId - UUID of the palette that was mutated.
 */
export function revalidatePalette(paletteId: string): void {
  revalidatePaletteList()
  revalidatePaletteDetail(paletteId)
}
